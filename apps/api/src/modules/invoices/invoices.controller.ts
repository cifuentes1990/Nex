import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Res, HttpStatus, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  // ── Estadísticas ─────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Invoice stats: totals, by status, this month' })
  getStats(@OrgId() orgId: string) {
    return this.invoicesService.getStats(orgId);
  }

  // ── Listar / Buscar ──────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List invoices with filters' })
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.invoicesService.findAll(orgId, query);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue invoices' })
  getOverdue(@OrgId() orgId: string) {
    return this.invoicesService.getOverdueInvoices(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(orgId, id);
  }

  // ── Crear ────────────────────────────────────────────────────────────
  @Post()
  @Roles('CASHIER', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create standalone invoice, quote or proforma' })
  create(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Body() dto: any,
  ) {
    return this.invoicesService.create(orgId, actor.id, dto);
  }

  // ── Actualizar ───────────────────────────────────────────────────────
  @Put(':id')
  @ApiOperation({ summary: 'Update invoice (PUT)' })
  updatePut(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.invoicesService.update(orgId, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invoice (PATCH)' })
  updatePatch(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.invoicesService.update(orgId, id, dto);
  }

  // ── Acciones de estado ───────────────────────────────────────────────
  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice (DRAFT → PENDING)' })
  send(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.sendInvoice(orgId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel invoice' })
  cancel(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.invoicesService.cancelInvoice(orgId, id, reason);
  }

  @Post(':id/credit-note')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create credit note against a paid invoice — MANAGER+' })
  creditNote(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('id') id: string,
    @Body() dto: { amount?: number; reason?: string },
  ) {
    return this.invoicesService.createCreditNote(orgId, id, actor.id, dto);
  }

  // ── Pago ─────────────────────────────────────────────────────────────
  @Post(':id/pay')
  @ApiOperation({ summary: 'Register a payment on an invoice (POST)' })
  markAsPaidPost(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { method: string; amount: number; reference?: string },
  ) {
    return this.invoicesService.markAsPaid(orgId, id, body);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Register a payment on an invoice (PATCH)' })
  markAsPaid(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { method: string; amount: number; reference?: string },
  ) {
    return this.invoicesService.markAsPaid(orgId, id, body);
  }

  // ── PDF ───────────────────────────────────────────────────────────────
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  async downloadPDF(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(orgId, id);
    const pdfBuffer = await this.invoicesService.generatePDF(orgId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoice.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
