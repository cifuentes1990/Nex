import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as dayjs from 'dayjs';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.anthropic = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  // =====================================================================
  // BUSINESS CONTEXT BUILDER — feeds AI with real business data
  // =====================================================================
  private async buildBusinessContext(organizationId: string): Promise<string> {
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const startOfLastMonth = now.subtract(1, 'month').startOf('month').toDate();

    const [org, monthSales, lastMonthSales, topProducts, lowStock, pendingInvoices, customerCount] =
      await Promise.all([
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, currency: true, businessType: true },
        }),
        this.prisma.order.aggregate({
          where: { organizationId, status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
          _sum: { total: true },
          _count: { id: true },
        }),
        this.prisma.order.aggregate({
          where: {
            organizationId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          },
          _sum: { total: true },
          _count: { id: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: { order: { organizationId, createdAt: { gte: startOfMonth } } },
          _sum: { total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 5,
        }),
        this.prisma.inventory.count({
          where: { organizationId, quantity: { lte: 5 } },
        }),
        this.prisma.invoice.aggregate({
          where: { organizationId, status: { in: ['PENDING', 'OVERDUE'] } },
          _sum: { balance: true },
          _count: true,
        }),
        this.prisma.customer.count({ where: { organizationId, isActive: true } }),
      ]);

    const topProductIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    const growth =
      lastMonthSales._sum.total && lastMonthSales._sum.total > 0
        ? (((monthSales._sum.total ?? 0) - lastMonthSales._sum.total) /
            lastMonthSales._sum.total) *
          100
        : 0;

    return `
CONTEXTO DEL NEGOCIO — ${now.format('DD/MM/YYYY HH:mm')}
Empresa: ${org?.name} | Tipo: ${org?.businessType} | Moneda: ${org?.currency}

VENTAS DEL MES ACTUAL:
- Total: ${org?.currency} ${(monthSales._sum.total ?? 0).toLocaleString()}
- Órdenes: ${monthSales._count.id}
- Crecimiento vs mes anterior: ${growth.toFixed(1)}%

VENTAS MES ANTERIOR:
- Total: ${org?.currency} ${(lastMonthSales._sum.total ?? 0).toLocaleString()}
- Órdenes: ${lastMonthSales._count.id}

TOP 5 PRODUCTOS DEL MES:
${topProducts.map((p, i) => `${i + 1}. ${productMap[p.productId] ?? 'N/A'} — ${org?.currency} ${(p._sum.total ?? 0).toLocaleString()}`).join('\n')}

ALERTAS:
- Productos con stock bajo (≤5 unidades): ${lowStock}
- Facturas pendientes: ${pendingInvoices._count} (Total: ${org?.currency} ${(pendingInvoices._sum.balance ?? 0).toLocaleString()})

CLIENTES ACTIVOS: ${customerCount}
FECHA ACTUAL: ${now.format('dddd, DD MMMM YYYY')}
    `.trim();
  }

  // =====================================================================
  // MAIN CHAT — Business AI Assistant
  // =====================================================================
  async chat(
    organizationId: string,
    userId: string,
    conversationId: string | null,
    userMessage: string,
  ) {
    const businessContext = await this.buildBusinessContext(organizationId);

    const systemPrompt = `Eres el Asistente de IA de Nexus ERP, un experto analista de negocios empresarial inteligente.
Tu rol es ayudar a los dueños y gerentes a tomar mejores decisiones de negocio.

CAPACIDADES:
- Análisis de ventas, inventario y finanzas en tiempo real
- Recomendaciones estratégicas basadas en datos
- Detección de problemas y oportunidades
- Generación de reportes y resúmenes ejecutivos
- Predicción de tendencias

DATOS DEL NEGOCIO EN TIEMPO REAL:
${businessContext}

INSTRUCCIONES:
- Responde en español, de forma clara, concisa y profesional
- Usa los datos del negocio para dar respuestas específicas y precisas
- Cuando detectes problemas, proporciona acciones concretas
- Usa emojis ocasionalmente para hacer la respuesta más dinámica
- Formatea números con separadores de miles y el símbolo de moneda del negocio`;

    // Load conversation history
    let messages: ChatMessage[] = [];
    let conversation = null;

    if (conversationId) {
      conversation = await this.prisma.aIConversation.findFirst({
        where: { id: conversationId, organizationId },
      });
      if (conversation) {
        messages = (conversation.messages as ChatMessage[]) || [];
      }
    }

    messages.push({ role: 'user', content: userMessage });

    // Try real AI first, fallback to smart local analysis
    let assistantMessage = '';
    let totalTokens = 0;

    const openaiKey = this.config.get('OPENAI_API_KEY', '');
    const anthropicKey = this.config.get('ANTHROPIC_API_KEY', '');
    const hasRealOpenAI = openaiKey && !openaiKey.includes('placeholder') && openaiKey.startsWith('sk-') && openaiKey.length > 20;
    const hasRealAnthropic = anthropicKey && !anthropicKey.includes('placeholder') && anthropicKey.startsWith('sk-ant-') && anthropicKey.length > 20;

    try {
      if (hasRealOpenAI) {
        const response = await this.openai.chat.completions.create({
          model: this.config.get('OPENAI_MODEL', 'gpt-4-turbo-preview'),
          messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-20)],
          temperature: 0.7,
          max_tokens: 1500,
        });
        assistantMessage = response.choices[0].message.content ?? '';
        totalTokens = response.usage?.total_tokens ?? 0;
      } else if (hasRealAnthropic) {
        const response = await this.anthropic.messages.create({
          model: this.config.get('ANTHROPIC_MODEL', 'claude-opus-4-5'),
          max_tokens: 1500,
          system: systemPrompt,
          messages: messages.slice(-20).map(m => ({ role: m.role === 'system' ? 'user' : m.role as 'user' | 'assistant', content: m.content })),
        });
        assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
        totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
      } else {
        assistantMessage = this.generateSmartResponse(userMessage, businessContext);
        totalTokens = 0;
      }
    } catch (error) {
      this.logger.warn(`AI provider failed, using smart fallback: ${error.message}`);
      assistantMessage = this.generateSmartResponse(userMessage, businessContext);
    }

    messages.push({ role: 'assistant', content: assistantMessage });

    const cost = (totalTokens / 1000) * 0.01;

    if (conversationId && conversation) {
      await this.prisma.aIConversation.update({
        where: { id: conversationId },
        data: {
          messages: messages as any,
          tokens: { increment: totalTokens },
          cost: { increment: cost },
        },
      });
    } else {
      conversation = await this.prisma.aIConversation.create({
        data: {
          organizationId,
          userId,
          title: userMessage.substring(0, 60),
          messages: messages as any,
          tokens: totalTokens,
          cost,
        },
      });
    }

    return {
      message: assistantMessage,
      conversationId: conversation?.id,
      tokens: totalTokens,
    };
  }

  // =====================================================================
  // SMART LOCAL RESPONSE — works without any API key
  // =====================================================================
  private generateSmartResponse(userMessage: string, context: string): string {
    const msg = userMessage.toLowerCase();

    // Parse context values
    const extract = (label: string): string => {
      const match = context.match(new RegExp(`${label}[:\\s]+([^\\n]+)`));
      return match ? match[1].trim() : 'N/A';
    };

    const empresa = extract('Empresa');
    const totalMes = extract('Total');
    const ordenesMes = extract('Órdenes');
    const crecimiento = extract('Crecimiento vs mes anterior');
    const stockBajo = extract('Productos con stock bajo');
    const facturasPendientes = extract('Facturas pendientes');
    const clientes = extract('CLIENTES ACTIVOS');

    // Extract top products block
    const topMatch = context.match(/TOP 5 PRODUCTOS DEL MES:\n([\s\S]*?)\n\n/);
    const topProductos = topMatch ? topMatch[1] : 'Sin datos aún';

    // Keyword routing
    if (msg.match(/venta|ingreso|revenue|factura.*mes|dinero.*mes/)) {
      return `## 💰 Resumen de Ventas — ${empresa}

**Este mes has generado:**
- **Total de ventas:** ${totalMes}
- **Número de órdenes:** ${ordenesMes}
- **Crecimiento vs mes anterior:** ${crecimiento}

### Top 5 Productos del mes:
${topProductos}

### Facturas pendientes de cobro:
- ${facturasPendientes}

> 💡 **Recomendación:** ${parseFloat(crecimiento) >= 0 ? 'Vas por buen camino. Mantén el ritmo y enfócate en tus productos estrella para maximizar el margen.' : 'El mes muestra una baja respecto al anterior. Considera activar promociones o contactar clientes inactivos para recuperar ventas.'}`;
    }

    if (msg.match(/producto|rentable|top|mejor.*vend|más.*vend/)) {
      return `## 🏆 Análisis de Productos — ${empresa}

### Top 5 Productos más rentables del mes:
${topProductos}

### Recomendaciones estratégicas:
1. **Impulsa tus productos estrella** — Asegura stock suficiente para no perder ventas.
2. **Revisa márgenes** — Verifica que el costo de los top productos esté optimizado.
3. **Cross-selling** — Combina los productos más vendidos en paquetes o promociones.
4. **Análisis de tendencias** — Compara con el mes anterior para detectar cuáles están subiendo.

> 💡 Para ver el análisis completo de demanda de un producto específico, pregúntame por su nombre.`;
    }

    if (msg.match(/stock|inventario|reabastec|agotar|agotado|bajo/)) {
      return `## 📦 Alerta de Inventario — ${empresa}

### Estado actual:
- ⚠️ **Productos con stock bajo (≤5 unidades):** ${stockBajo}

### Acciones urgentes recomendadas:
1. **Revisa el módulo de Inventario** → filtra por "Stock Bajo" para ver la lista completa.
2. **Contacta proveedores** → genera órdenes de compra para los productos críticos.
3. **Prioriza por rotación** → reabastecer primero los productos top en ventas.
4. **Ajusta el punto de reorden** → configura alertas automáticas en el sistema.

> 🔴 Un stockout en tus productos más vendidos puede significar pérdida directa de ventas. Actúa pronto.`;
    }

    if (msg.match(/cliente|crm|fideliz|nuevo.*cliente|retenci/)) {
      return `## 👥 Análisis de Clientes — ${empresa}

### Métricas actuales:
- **Clientes activos:** ${clientes}
- **Órdenes este mes:** ${ordenesMes}

### Estrategias de fidelización recomendadas:
1. **Programa de puntos** — Los clientes con más compras merecen beneficios exclusivos.
2. **Campañas de reactivación** — Identifica clientes que no compran hace +30 días y envíales una oferta.
3. **Segmentación VIP** — Crea un segmento para tus top 20% de clientes por gasto.
4. **Postventa proactiva** — Contacta clientes después de cada compra para garantizar satisfacción.

> 💡 Ve al módulo CRM → filtra por "Última compra" para identificar clientes en riesgo de abandono.`;
    }

    if (msg.match(/alerta|problema|urgente|crisis|riesgo/)) {
      const alertas: string[] = [];
      if (parseInt(stockBajo) > 0) alertas.push(`⚠️ **${stockBajo} productos con stock crítico** — Riesgo de quiebre de inventario`);
      if (!facturasPendientes.includes('0')) alertas.push(`💳 **Facturas pendientes de cobro** — ${facturasPendientes} — Flujo de caja en riesgo`);
      if (parseFloat(crecimiento) < 0) alertas.push(`📉 **Caída en ventas del ${Math.abs(parseFloat(crecimiento)).toFixed(1)}%** vs mes anterior`);

      return `## 🚨 Panel de Alertas — ${empresa}

${alertas.length > 0 ? alertas.join('\n') : '✅ No hay alertas críticas en este momento.'}

### Plan de acción inmediato:
${parseInt(stockBajo) > 0 ? '1. **Inventario** → Ve al módulo de inventario y genera órdenes de compra para productos críticos.\n' : ''}${!facturasPendientes.includes('0') ? '2. **Facturación** → Accede a facturas pendientes y envía recordatorios de pago a clientes.\n' : ''}${parseFloat(crecimiento) < 0 ? '3. **Ventas** → Activa una campaña promocional para recuperar el volumen del mes anterior.\n' : ''}

> 📊 Revisión diaria recomendada: Inventario → Facturas → Ventas del día`;
    }

    if (msg.match(/estrategia|venta|crecer|aumentar|mejorar|consejo/)) {
      return `## 🎯 Estrategias para Aumentar Ventas — ${empresa}

Basado en los datos actuales de tu negocio, aquí van 5 estrategias concretas:

### 1. 🛒 Optimiza el ticket promedio
Implementa **cross-selling** en el POS — cuando un cliente compra un producto, sugiere complementos relacionados. Esto puede aumentar el ticket en un 15-25%.

### 2. 📣 Reactiva clientes inactivos
Crea un segmento de clientes que no han comprado en los últimos 30 días y envíales una oferta personalizada (10% de descuento, envío gratis, etc.).

### 3. 🏆 Potencia tus top productos
${topProductos.split('\n').slice(0, 3).join('\n')}
Asegura stock permanente de estos productos y crea bundles o kits con ellos.

### 4. ⏰ Crea urgencia de compra
Promociones por tiempo limitado (24-48h) generan un aumento del 30-40% en conversión. Usa el módulo de automatizaciones para activarlas.

### 5. 💳 Reduce facturas pendientes
Cobrando ${facturasPendientes} mejoras el flujo de caja disponible para invertir en inventario y marketing.`;
    }

    if (msg.match(/financiero|flujo|caja|balance|resumen.*financiero/)) {
      return `## 📊 Resumen Financiero — ${empresa}

### Este mes:
| Métrica | Valor |
|---------|-------|
| Ventas totales | ${totalMes} |
| Órdenes procesadas | ${ordenesMes} |
| Crecimiento | ${crecimiento} |
| Clientes activos | ${clientes} |

### Cuentas por cobrar:
- Facturas pendientes: ${facturasPendientes}

> ⚡ **Estado de liquidez:** ${parseFloat(crecimiento) >= 0 ? 'Positivo — las ventas superan el mes anterior.' : 'Atención — las ventas bajaron respecto al mes anterior.'}

### Recomendaciones financieras:
1. Cobra las facturas pendientes lo antes posible para mejorar el flujo de caja.
2. Mantén un fondo de 3 meses de gastos operativos como reserva.
3. Analiza los márgenes de tus top productos para maximizar rentabilidad.`;
    }

    if (msg.match(/campaña|promo|descuento|marketing/)) {
      return `## 📣 Ideas de Campaña para ${empresa}

### Campaña recomendada según tus datos:

**🎯 "Lleva 2, paga 1.5" — Top productos**
- Aplica sobre tus productos más vendidos del mes.
- Duración: 48-72 horas para crear urgencia.
- Canal: WhatsApp a tu base de clientes activos (${clientes} clientes).

**🔄 "Reactivación de clientes"**
- Segmento: Clientes sin compra en +30 días.
- Oferta: 10% de descuento en su próxima compra.
- Mensaje: "¡Te echamos de menos! Aquí tienes un regalo."

**📦 "Liquida tu stock"**
- Para los ${stockBajo} productos con stock bajo.
- Oferta especial para salir del inventario antes de reabastecer.

> 💡 Ve al módulo de **Automatizaciones** para programar estas campañas y que se ejecuten solas.`;
    }

    // Default response with full context
    return `## 🤖 Nexus AI Assistant — ${empresa}

¡Hola! Tengo acceso en tiempo real a los datos de tu negocio. Aquí está un resumen rápido:

### 📈 Estado actual:
- **Ventas del mes:** ${totalMes} (${ordenesMes} órdenes)
- **Crecimiento:** ${crecimiento}
- **Clientes activos:** ${clientes}
- **Stock bajo:** ${stockBajo} productos
- **Facturas pendientes:** ${facturasPendientes}

### 💬 Puedo ayudarte con:
- **"¿Cuál es mi producto más rentable?"** → Análisis de productos top
- **"¿Qué productos debo reabastecer?"** → Alertas de inventario
- **"Dame un resumen financiero"** → Estado de ventas y cuentas
- **"¿Qué alertas tengo hoy?"** → Panel de alertas críticas
- **"Dame estrategias para vender más"** → Recomendaciones estratégicas
- **"Genera una campaña de marketing"** → Ideas de promoción

¿Sobre qué quieres profundizar?`;
  }

  // =====================================================================
  // GENERATE AI INSIGHTS — automatic business analysis
  // =====================================================================
  async generateInsights(organizationId: string) {
    const context = await this.buildBusinessContext(organizationId);

    const openaiKey = this.config.get('OPENAI_API_KEY', '');
    const hasRealOpenAI = openaiKey && !openaiKey.includes('placeholder') && openaiKey.startsWith('sk-') && openaiKey.length > 20;

    let insights: any[] = [];

    if (hasRealOpenAI) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.get('OPENAI_MODEL', 'gpt-4-turbo-preview'),
          messages: [
            {
              role: 'system',
              content: `Eres un analista de negocios. Analiza los datos y genera exactamente 5 insights accionables en formato JSON.
El formato debe ser un array JSON con objetos: { type, title, description, score, action }
- type: "opportunity" | "warning" | "alert" | "trend"
- score: número del 1 al 10
- action: acción concreta`,
            },
            { role: 'user', content: `Analiza este negocio y genera 5 insights en JSON:\n${context}` },
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' },
        });
        const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
        insights = parsed.insights || parsed || [];
      } catch {
        insights = this.generateSmartInsights(context);
      }
    } else {
      insights = this.generateSmartInsights(context);
    }

    // Save to database
    await this.prisma.aIInsight.createMany({
      data: (Array.isArray(insights) ? insights : []).map((insight: any) => ({
        organizationId,
        type: insight.type || 'INSIGHT',
        title: insight.title,
        description: insight.description,
        score: insight.score ? insight.score / 10 : 0.7,
        action: insight.action,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })),
    });

    return insights;
  }

  private generateSmartInsights(context: string): any[] {
    const extract = (label: string): string => {
      const match = context.match(new RegExp(`${label}[:\\s]+([^\\n]+)`));
      return match ? match[1].trim() : '0';
    };

    const crecimiento = parseFloat(extract('Crecimiento vs mes anterior')) || 0;
    const stockBajo = parseInt(extract('Productos con stock bajo')) || 0;
    const factPendientesStr = extract('Facturas pendientes');
    const factPendientes = parseInt(factPendientesStr.split(' ')[0]) || 0;
    const totalMes = extract('Total');
    const clientes = parseInt(extract('CLIENTES ACTIVOS')) || 0;

    const insights: any[] = [];

    // Stock insight
    if (stockBajo > 0) {
      insights.push({
        type: stockBajo > 5 ? 'WARNING' : 'INSIGHT',
        title: `⚠️ ${stockBajo} producto${stockBajo > 1 ? 's' : ''} con stock crítico`,
        description: `Tienes ${stockBajo} producto${stockBajo > 1 ? 's' : ''} con 5 o menos unidades. Esto puede generar quiebres de inventario y pérdida de ventas si no actúas pronto.`,
        score: stockBajo > 10 ? 9 : stockBajo > 5 ? 7 : 5,
        action: 'Ver inventario crítico y generar órdenes de compra',
      });
    }

    // Growth insight
    if (crecimiento > 5) {
      insights.push({
        type: 'OPPORTUNITY',
        title: `📈 Ventas creciendo +${crecimiento.toFixed(1)}% este mes`,
        description: `El negocio muestra un crecimiento positivo de ${crecimiento.toFixed(1)}% respecto al mes anterior. Es el momento ideal para escalar y capturar mayor participación de mercado.`,
        score: 8,
        action: 'Refuerza inventario y activa campañas de adquisición de clientes',
      });
    } else if (crecimiento < -5) {
      insights.push({
        type: 'WARNING',
        title: `📉 Ventas bajaron ${Math.abs(crecimiento).toFixed(1)}% vs mes anterior`,
        description: `Las ventas de este mes muestran una caída del ${Math.abs(crecimiento).toFixed(1)}%. Es importante identificar la causa (menos clientes, ticket más bajo o productos lentos) y actuar rápido.`,
        score: 8,
        action: 'Activar campaña de promociones y revisar productos más lentos',
      });
    } else {
      insights.push({
        type: 'INSIGHT',
        title: `📊 Ventas estables — ${totalMes} este mes`,
        description: `Las ventas se mantienen en niveles similares al mes anterior (${crecimiento >= 0 ? '+' : ''}${crecimiento.toFixed(1)}%). Busca oportunidades para acelerar el crecimiento.`,
        score: 5,
        action: 'Analizar top productos y lanzar una promoción temporal',
      });
    }

    // Invoices insight
    if (factPendientes > 0) {
      insights.push({
        type: 'WARNING',
        title: `💳 ${factPendientes} factura${factPendientes > 1 ? 's' : ''} pendiente${factPendientes > 1 ? 's' : ''} de cobro`,
        description: `Tienes dinero sin cobrar en ${factPendientes} factura${factPendientes > 1 ? 's' : ''}. El cobro oportuno mejora tu flujo de caja y evita deudas incobrables.`,
        score: factPendientes > 5 ? 8 : 6,
        action: 'Ir a Facturación y enviar recordatorio de pago a clientes deudores',
      });
    }

    // Customer insight
    if (clientes > 0) {
      insights.push({
        type: 'OPPORTUNITY',
        title: `👥 ${clientes} clientes activos — potencial de fidelización`,
        description: `Tu base de ${clientes} clientes es un activo valioso. El costo de retener un cliente es 5x menor que adquirir uno nuevo. Un programa de lealtad puede aumentar la frecuencia de compra un 20-30%.`,
        score: 7,
        action: 'Crear segmento VIP en CRM y activar campaña de fidelización',
      });
    }

    // Generic growth tip
    insights.push({
      type: 'RECOMMENDATION',
      title: '🚀 Automatiza tus operaciones repetitivas',
      description: 'Las empresas que automatizan seguimiento de inventario, cobros y recordatorios ahorran 3-5 horas diarias y reducen errores humanos. Nexus ERP tiene automatizaciones listas para activar.',
      score: 6,
      action: 'Ir al módulo de Automatizaciones y activar flujos predefinidos',
    });

    return insights.slice(0, 5);
  }

  // =====================================================================
  // GENERATE PRODUCT DESCRIPTION
  // =====================================================================
  async generateProductDescription(product: {
    name: string;
    category?: string;
    price?: number;
    attributes?: Record<string, any>;
  }): Promise<{ description: string; shortDescription: string; tags: string[] }> {
    const response = await this.openai.chat.completions.create({
      model: this.config.get('OPENAI_MODEL', 'gpt-4-turbo-preview'),
      messages: [
        {
          role: 'system',
          content: `Eres un experto en copywriting para e-commerce.
Genera descripciones de productos persuasivas y optimizadas para SEO.
Responde SIEMPRE en JSON con exactamente estos campos: description, shortDescription, tags (array de strings)`,
        },
        {
          role: 'user',
          content: `Crea una descripción para este producto:
Nombre: ${product.name}
Categoría: ${product.category || 'General'}
Precio: ${product.price || 'N/A'}
Atributos: ${JSON.stringify(product.attributes || {})}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}');
    return {
      description: parsed.description || '',
      shortDescription: parsed.shortDescription || '',
      tags: parsed.tags || [],
    };
  }

  // =====================================================================
  // DEMAND PREDICTION for a product
  // =====================================================================
  async predictDemand(organizationId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    const salesHistory = await this.prisma.orderItem.findMany({
      where: {
        productId,
        order: { organizationId, status: { not: 'CANCELLED' }, createdAt: { gte: dayjs().subtract(90, 'day').toDate() } } as any,
      },
      select: { quantity: true, order: { select: { createdAt: true } } },
    });

    const dailySales: Record<string, number> = {};
    salesHistory.forEach((item) => {
      const date = dayjs(item.order.createdAt).format('YYYY-MM-DD');
      dailySales[date] = (dailySales[date] || 0) + item.quantity;
    });

    const values = Object.values(dailySales);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const trend = this.calculateTrend(values);

    const inventory = await this.prisma.inventory.findFirst({
      where: { organizationId, productId },
    });

    const daysUntilStockout =
      avg > 0 && inventory ? Math.floor(inventory.quantity / avg) : null;

    return {
      product: { id: product?.id, name: product?.name, sku: product?.sku },
      currentStock: inventory?.quantity ?? 0,
      avgDailySales: Math.round(avg * 100) / 100,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      trendPercentage: Math.round(Math.abs(trend) * 100) / 100,
      daysUntilStockout,
      recommendedReorderQty: Math.ceil(avg * 30), // 30-day supply
      reorderUrgency:
        daysUntilStockout !== null
          ? daysUntilStockout <= 7
            ? 'CRITICAL'
            : daysUntilStockout <= 14
              ? 'HIGH'
              : daysUntilStockout <= 30
                ? 'MEDIUM'
                : 'LOW'
          : 'UNKNOWN',
    };
  }

  // =====================================================================
  // AUTO-GENERATE PROMOTION CAMPAIGN
  // =====================================================================
  async generatePromotion(organizationId: string, type: 'slow_products' | 'seasonal' | 'vip') {
    const context = await this.buildBusinessContext(organizationId);

    let prompt = '';
    if (type === 'slow_products') {
      prompt = 'Genera una campaña de promoción para reactivar productos con baja rotación.';
    } else if (type === 'seasonal') {
      prompt = `Genera una campaña estacional aprovechando la fecha actual: ${dayjs().format('MMMM YYYY')}.`;
    } else {
      prompt = 'Genera una campaña de fidelización VIP para clientes frecuentes.';
    }

    const response = await this.anthropic.messages.create({
      model: this.config.get('ANTHROPIC_MODEL', 'claude-opus-4-7'),
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nContexto del negocio:\n${context}\n\nResponde en JSON con: { name, subject, content, discount, segment, targetMetric }`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      return JSON.parse(text);
    } catch {
      return { name: 'Campaña generada por IA', content: text };
    }
  }

  // =====================================================================
  // FRAUD DETECTION
  // =====================================================================
  async detectAnomalies(organizationId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        createdAt: { gte: dayjs().subtract(7, 'day').toDate() },
      },
      include: { items: true, payments: true },
      orderBy: { total: 'desc' },
      take: 100,
    });

    const totals = orders.map((o) => o.total);
    const avg = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
    const std = Math.sqrt(totals.reduce((a, b) => a + (b - avg) ** 2, 0) / (totals.length || 1));

    const suspicious = orders.filter((o) => {
      const zScore = (o.total - avg) / (std || 1);
      return zScore > 3 || o.total > avg * 5;
    });

    return {
      totalOrders: orders.length,
      averageOrderValue: Math.round(avg),
      standardDeviation: Math.round(std),
      suspiciousOrders: suspicious.map((o) => ({
        id: o.id,
        number: o.number,
        total: o.total,
        zScore: Math.round(((o.total - avg) / (std || 1)) * 100) / 100,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
      riskLevel:
        suspicious.length > 5 ? 'HIGH' : suspicious.length > 2 ? 'MEDIUM' : 'LOW',
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const half = Math.floor(n / 2);
    const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (n - half);
    return firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  }

  async getInsights(organizationId: string) {
    return this.prisma.aIInsight.findMany({
      where: { organizationId, isDismissed: false, expiresAt: { gt: new Date() } },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
  }

  async dismissInsight(id: string, organizationId: string) {
    return this.prisma.aIInsight.update({
      where: { id },
      data: { isDismissed: true },
    });
  }
}
