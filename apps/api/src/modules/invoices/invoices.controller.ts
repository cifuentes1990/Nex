import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Res, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

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
}
