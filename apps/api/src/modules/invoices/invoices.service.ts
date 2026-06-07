import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {}

  // ── Crear factura standalone ──────────────────────────────────────────
  async create(organizationId: string, actorId: string, dto: any) {
    if (!dto.items?.length) throw new BadRequestException('La factura debe tener al menos un ítem');

    const number = await this.generateInvoiceNumber(organizationId, dto.type ?? 'INV');
    const subtotal = dto.items.reduce((s: number, i: any) => s + Number(i.unitPrice) * Number(i.quantity), 0);
    const discountAmount = Number(dto.discountAmount ?? 0);
    const taxBase = subtotal - discountAmount;
    const taxRate = Number(dto.taxRate ?? 0.19);
    const taxAmount = Number(dto.taxAmount ?? taxBase * taxRate);
    const total = taxBase + taxAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: dto.customerId ?? null,
        branchId: dto.branchId ?? null,
        createdById: actorId,
        number,
        status: dto.status ?? 'PENDING',
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paidAmount: 0,
        balance: total,
        notes: dto.notes,
        terms: dto.terms,
        metadata: { type: dto.type ?? 'INVOICE', channel: dto.channel ?? 'MANUAL', ...dto.metadata },
        items: {
          create: dto.items.map((item: any) => {
            const qty    = Number(item.quantity);
            const price  = Number(item.unitPrice);
            const disc   = Number(item.discount ?? 0);
            const tRate  = Number(item.taxRate ?? taxRate);
            const sub    = price * qty - disc;
            const tax    = sub * tRate;
            return {
              productId:   item.productId ?? null,
              name:        item.name,
              description: item.description ?? null,
              quantity:    qty,
              unitPrice:   price,
              discount:    disc,
              taxRate:     tRate,
              taxAmount:   tax,
              subtotal:    sub,
              total:       sub + tax,
            };
          }),
        },
      },
      include: {
        items: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    this.events.emit('invoice.created', { organizationId, invoice });
    return invoice;
  }

  // ── Actualizar factura (sólo DRAFT / PENDING) ─────────────────────────
  async update(organizationId: string, id: string, dto: any) {
    const invoice = await this.findOne(organizationId, id);
    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      throw new BadRequestException('No se puede editar una factura pagada o cancelada');
    }

    const data: any = {};
    if (dto.customerId !== undefined) data.customerId = dto.customerId;
    if (dto.dueDate     !== undefined) data.dueDate   = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes       !== undefined) data.notes     = dto.notes;
    if (dto.terms       !== undefined) data.terms     = dto.terms;
    if (dto.status      !== undefined) data.status    = dto.status;

    return this.prisma.invoice.update({ where: { id }, data });
  }

  // ── Enviar factura (DRAFT → PENDING) ────────────────────────────────
  async sendInvoice(organizationId: string, id: string) {
    const invoice = await this.findOne(organizationId, id);
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Solo se pueden enviar facturas en borrador');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'PENDING', sentAt: new Date() },
    });
  }

  // ── Cancelar factura ─────────────────────────────────────────────────
  async cancelInvoice(organizationId: string, id: string, reason?: string) {
    const invoice = await this.findOne(organizationId, id);
    if (invoice.status === 'PAID') throw new BadRequestException('No se puede cancelar una factura pagada');

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelada: ${reason}` : invoice.notes,
      },
    });
  }

  // ── Nota crédito (vincula a factura original vía metadata) ────────────
  async createCreditNote(organizationId: string, originalId: string, actorId: string, dto: any) {
    const original = await this.findOne(organizationId, originalId);
    if (original.status !== 'PAID') throw new BadRequestException('Solo se puede crear nota crédito sobre facturas pagadas');

    const amount = Number(dto.amount ?? original.total);
    const number = await this.generateInvoiceNumber(organizationId, 'NC');

    const creditNote = await this.prisma.invoice.create({
      data: {
        organizationId,
        customerId: original.customerId,
        branchId:   (original as any).branchId,
        createdById: actorId,
        number,
        status: 'REFUNDED',
        issueDate: new Date(),
        subtotal: -amount,
        taxAmount: 0,
        total: -amount,
        paidAmount: -amount,
        balance: 0,
        paidAt: new Date(),
        notes: dto.reason ?? `Nota crédito de ${original.number}`,
        metadata: { type: 'CREDIT_NOTE', originalInvoiceId: originalId, originalNumber: original.number },
        items: {
          create: [{
            name: `Nota crédito — ${original.number}`,
            description: dto.reason ?? 'Reembolso',
            quantity: 1,
            unitPrice: -amount,
            discount: 0,
            taxRate: 0,
            taxAmount: 0,
            subtotal: -amount,
            total: -amount,
          }],
        },
      },
    });

    // Reembolsar el pago original
    await this.prisma.payment.create({
      data: {
        organizationId,
        invoiceId: originalId,
        method: 'CASH',
        amount: -amount,
        currency: 'COP',
        reference: creditNote.number,
        status: 'REFUNDED',
        notes: `Nota crédito ${creditNote.number}`,
      },
    });

    this.events.emit('invoice.refunded', { organizationId, originalId, creditNote });
    return creditNote;
  }

  // ── Estadísticas de facturación ──────────────────────────────────────
  async getStats(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, monthly, byStatus] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { organizationId },
        _sum: { total: true, paidAmount: true, balance: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { organizationId, issueDate: { gte: startOfMonth } },
        _sum: { total: true, paidAmount: true },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
        _sum: { total: true },
      }),
    ]);

    return {
      total: total._count,
      totalRevenue:  total._sum.total    ?? 0,
      totalCollected: total._sum.paidAmount ?? 0,
      totalBalance:  total._sum.balance   ?? 0,
      thisMonth: {
        count:    monthly._count,
        revenue:  monthly._sum.total ?? 0,
        collected: monthly._sum.paidAmount ?? 0,
      },
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count,
        total: s._sum.total ?? 0,
      })),
    };
  }

  private async generateInvoiceNumber(organizationId: string, prefix = 'INV'): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const pat = `${prefix}-${ym}`;
    const count = await this.prisma.invoice.count({
      where: { organizationId, number: { startsWith: pat } },
    });
    return `${pat}-${String(count + 1).padStart(5, '0')}`;
  }

  async findAll(organizationId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const { status, customerId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
          createdBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const mapped = items.map((inv) => ({
      ...inv,
      invoiceNumber: inv.number,
      customer: inv.customer ? { ...inv.customer, name: `${inv.customer.firstName}${inv.customer.lastName ? ' ' + inv.customer.lastName : ''}` } : null,
    }));
    return { items: mapped, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { product: { select: { name: true, sku: true, image: true } } } },
        customer: true,
        createdBy: { select: { name: true, email: true } },
        payments: true,
        order: { select: { number: true, channel: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async generatePDF(organizationId: string, id: string): Promise<Buffer> {
    const invoice = await this.findOne(organizationId, id);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ── COLORS & FONTS ──────────────────────────────────────────
      const PRIMARY = '#6366f1';
      const DARK = '#1e1b4b';
      const GRAY = '#6b7280';
      const LIGHT_GRAY = '#f9fafb';

      // ── HEADER ──────────────────────────────────────────────────
      doc.rect(0, 0, 595, 120).fill(DARK);

      doc.fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(24)
        .text(org?.name ?? 'Nexus ERP', 50, 35);

      doc.fillColor('#a5b4fc')
        .font('Helvetica')
        .fontSize(10)
        .text(`NIT: ${org?.taxId ?? ''}`, 50, 65)
        .text(`${org?.address ?? ''}, ${org?.city ?? ''}`, 50, 80)
        .text(`${org?.phone ?? ''} | ${org?.email ?? ''}`, 50, 95);

      // Invoice title (right side)
      doc.fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('FACTURA', 400, 35, { align: 'right', width: 145 });

      doc.fillColor('#a5b4fc')
        .font('Helvetica')
        .fontSize(11)
        .text(`# ${invoice.number}`, 400, 62, { align: 'right', width: 145 });

      doc.fillColor('#6ee7b7')
        .fontSize(10)
        .text(invoice.status === 'PAID' ? '✓ PAGADA' : invoice.status, 400, 80, { align: 'right', width: 145 });

      // ── INVOICE DETAILS ─────────────────────────────────────────
      doc.rect(0, 120, 595, 80).fill(LIGHT_GRAY);

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10);
      doc.text('FECHA DE EMISIÓN', 50, 135);
      doc.text('FECHA DE VENCIMIENTO', 200, 135);
      doc.text('MÉTODO DE PAGO', 370, 135);

      doc.font('Helvetica').fillColor(GRAY).fontSize(10);
      doc.text(invoice.issueDate.toLocaleDateString('es-CO'), 50, 152);
      doc.text(invoice.dueDate?.toLocaleDateString('es-CO') ?? 'Inmediato', 200, 152);
      doc.text(invoice.payments[0]?.method?.replace('_', ' ') ?? 'N/A', 370, 152);

      // ── CUSTOMER ────────────────────────────────────────────────
      let y = 220;
      if (invoice.customer) {
        doc.rect(0, 200, 595, 1).fill('#e5e7eb');
        doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11).text('FACTURAR A:', 50, 210);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11)
          .text(`${invoice.customer.firstName} ${invoice.customer.lastName ?? ''}`, 50, 227);
        doc.fillColor(GRAY).font('Helvetica').fontSize(10)
          .text(invoice.customer.email ?? '', 50, 242)
          .text(invoice.customer.phone ?? '', 50, 257);
        y = 285;
      }

      // ── TABLE HEADER ────────────────────────────────────────────
      doc.rect(50, y, 495, 28).fill(PRIMARY);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
      doc.text('PRODUCTO / SERVICIO', 60, y + 9);
      doc.text('CANT.', 330, y + 9, { width: 50, align: 'center' });
      doc.text('PRECIO UNIT.', 385, y + 9, { width: 80, align: 'right' });
      doc.text('TOTAL', 465, y + 9, { width: 70, align: 'right' });

      y += 28;

      // ── TABLE ROWS ──────────────────────────────────────────────
      for (const [i, item] of invoice.items.entries()) {
        const rowBg = i % 2 === 0 ? 'white' : LIGHT_GRAY;
        doc.rect(50, y, 495, 26).fill(rowBg);

        doc.fillColor(DARK).font('Helvetica').fontSize(9);
        doc.text(item.name, 60, y + 8, { width: 265, ellipsis: true });
        doc.text(String(item.quantity), 330, y + 8, { width: 50, align: 'center' });
        doc.text(this.formatCurrency(item.unitPrice), 385, y + 8, { width: 80, align: 'right' });
        doc.text(this.formatCurrency(item.total), 465, y + 8, { width: 70, align: 'right' });

        y += 26;
      }

      // ── TOTALS ──────────────────────────────────────────────────
      y += 20;
      doc.rect(350, y, 195, 1).fill('#e5e7eb');
      y += 10;

      const totalsY = y;
      doc.fillColor(GRAY).font('Helvetica').fontSize(10);

      doc.text('Subtotal:', 360, totalsY);
      doc.text(this.formatCurrency(invoice.subtotal), 465, totalsY, { width: 70, align: 'right' });

      if (invoice.discountAmount > 0) {
        doc.text('Descuento:', 360, totalsY + 20);
        doc.text(`-${this.formatCurrency(invoice.discountAmount)}`, 465, totalsY + 20, { width: 70, align: 'right' });
      }

      doc.text(`IVA (19%):`, 360, totalsY + 40);
      doc.text(this.formatCurrency(invoice.taxAmount), 465, totalsY + 40, { width: 70, align: 'right' });

      // Total box
      doc.rect(350, totalsY + 58, 195, 34).fill(PRIMARY);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(13);
      doc.text('TOTAL:', 360, totalsY + 69);
      doc.text(this.formatCurrency(invoice.total), 430, totalsY + 69, { width: 105, align: 'right' });

      // ── QR CODE ─────────────────────────────────────────────────
      try {
        const qrData = JSON.stringify({
          inv: invoice.number,
          total: invoice.total,
          date: invoice.issueDate,
          org: org?.name,
        });
        const qrBuffer = await QRCode.toBuffer(qrData, { width: 80, margin: 1 });
        doc.image(qrBuffer, 50, totalsY, { width: 80 });
        doc.fillColor(GRAY).font('Helvetica').fontSize(8)
          .text('Escanea para verificar', 50, totalsY + 85, { width: 80, align: 'center' });
      } catch {
        // QR generation failed, skip
      }

      // ── FOOTER ──────────────────────────────────────────────────
      doc.rect(0, 760, 595, 80).fill(DARK);
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8)
        .text('Generado por Nexus ERP • nexuserp.com', 50, 780, { align: 'center', width: 495 })
        .text('Este documento es válido como comprobante de pago.', 50, 796, { align: 'center', width: 495 });

      doc.end();
    });
  }

  async markAsPaid(organizationId: string, id: string, paymentData: any) {
    const invoice = await this.findOne(organizationId, id);
    const payAmount = paymentData?.amount ?? invoice.balance ?? invoice.total;

    const payment = await this.prisma.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          organizationId,
          invoiceId: id,
          method: paymentData?.method ?? 'CASH',
          amount: payAmount,
          reference: paymentData?.reference,
          status: 'COMPLETED',
        },
      });

      const newPaid = (invoice.paidAmount ?? 0) + payAmount;
      const newBalance = invoice.total - newPaid;

      await tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          balance: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID',
          paidAt: newBalance <= 0 ? new Date() : null,
        },
      });

      return pay;
    });

    this.events.emit('invoice.paid', { organizationId, invoiceId: id });
    return payment;
  }

  async getOverdueInvoices(organizationId: string) {
    const today = new Date();

    const overdue = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
      include: { customer: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { dueDate: 'asc' },
    });

    // Mark as overdue
    await this.prisma.invoice.updateMany({
      where: {
        organizationId,
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
      data: { status: 'OVERDUE' },
    });

    return overdue;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
