import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 465),
        secure: this.config.get<number>('SMTP_PORT', 465) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER', 'resend'),
          pass,
        },
      });
      this.logger.log(`MailService: SMTP configurado (${host}) ✅`);
    } else {
      this.logger.warn(
        'MailService: SMTP_HOST / SMTP_PASS no configurados — los emails no se enviarán. ' +
        'Configura las variables SMTP_* en tu .env (compatible con Resend, SendGrid, Mailgun, etc.)',
      );
    }
  }

  // ── Recuperación de contraseña ──────────────────────────────────────────
  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    if (!this.transporter) return;

    const appUrl   = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const from     = this.config.get<string>('SMTP_FROM', 'Nexus ERP <noreply@nexuserp.com>');
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Restablecer tu contraseña — Nexus ERP',
        html: this.tplPasswordReset(name, resetUrl),
      });
      this.logger.log(`Password reset email → ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${to}`, err);
    }
  }

  // ── Notificación de bienvenida ──────────────────────────────────────────
  async sendWelcome(to: string, name: string, orgName: string): Promise<void> {
    if (!this.transporter) return;

    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const from   = this.config.get<string>('SMTP_FROM', 'Nexus ERP <noreply@nexuserp.com>');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `¡Bienvenido a Nexus ERP, ${name}!`,
        html: this.tplWelcome(name, orgName, appUrl),
      });
      this.logger.log(`Welcome email → ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando welcome a ${to}`, err);
    }
  }

  // ── Alerta de stock bajo ────────────────────────────────────────────────
  async sendLowStockAlert(to: string, products: { name: string; stock: number; sku: string }[]): Promise<void> {
    if (!this.transporter || products.length === 0) return;

    const from = this.config.get<string>('SMTP_FROM', 'Nexus ERP <noreply@nexuserp.com>');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `⚠️ ${products.length} producto(s) con stock bajo — Nexus ERP`,
        html: this.tplLowStock(products),
      });
    } catch (err) {
      this.logger.error('Error enviando alerta de stock bajo', err);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Templates
  // ────────────────────────────────────────────────────────────────────────

  private wrap(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:580px;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 40px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">⚡ Nexus ERP</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma empresarial</p>
        </td>
      </tr>

      <!-- Body -->
      <tr><td style="padding:36px 40px;">${body}</td></tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:18px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">
            © ${new Date().getFullYear()} Nexus ERP · Este mensaje fue generado automáticamente.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  private tplPasswordReset(name: string, resetUrl: string): string {
    return this.wrap('Restablecer contraseña', `
      <p style="margin:0 0 16px;color:#111827;font-size:16px;">Hola <strong>${name}</strong>,</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.65;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Nexus ERP.
        Haz clic en el botón para continuar:
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                 color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;
                 font-weight:700;font-size:15px;letter-spacing:0.2px;">
          🔑 Restablecer contraseña
        </a>
      </div>

      <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">
        ¿El botón no funciona? Copia este enlace:
      </p>
      <p style="margin:0 0 28px;word-break:break-all;color:#6366f1;font-size:12px;">${resetUrl}</p>

      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          ⚠️ Este enlace expira en <strong>1 hora</strong>.
          Si no solicitaste este cambio, ignora este mensaje.
        </p>
      </div>
    `);
  }

  private tplWelcome(name: string, orgName: string, appUrl: string): string {
    return this.wrap(`¡Bienvenido, ${name}!`, `
      <p style="margin:0 0 16px;color:#111827;font-size:16px;">¡Hola <strong>${name}</strong>! 🎉</p>
      <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.65;">
        Tu cuenta en <strong>Nexus ERP</strong> ha sido creada exitosamente para la organización
        <strong>${orgName}</strong>. Ya puedes empezar a gestionar tu negocio.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 8px;color:#15803d;font-weight:700;font-size:14px;">✅ Lo que puedes hacer ahora:</p>
        <ul style="margin:0;padding-left:20px;color:#166534;font-size:13px;line-height:1.8;">
          <li>Registrar ventas desde el módulo POS</li>
          <li>Agregar tus productos e inventario</li>
          <li>Gestionar pedidos a domicilio</li>
          <li>Ver analíticas en tiempo real</li>
        </ul>
      </div>

      <div style="text-align:center;">
        <a href="${appUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                 color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;
                 font-weight:700;font-size:15px;">
          Ir a Nexus ERP →
        </a>
      </div>
    `);
  }

  private tplLowStock(products: { name: string; stock: number; sku: string }[]): string {
    const rows = products.map(p => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">${p.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">${p.sku}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
          <span style="background:#fef2f2;color:#dc2626;font-weight:700;font-size:13px;
                       padding:2px 10px;border-radius:20px;">${p.stock} ud</span>
        </td>
      </tr>
    `).join('');

    return this.wrap('Alerta de stock bajo', `
      <p style="margin:0 0 16px;color:#111827;font-size:16px;">⚠️ <strong>Productos con stock crítico</strong></p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        Los siguientes productos tienen pocas unidades disponibles:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">PRODUCTO</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">SKU</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">STOCK</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  }
}
