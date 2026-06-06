import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  @Get('stats')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Purchase orders stats' })
  getStats(@OrgId() orgId: string) {
    return this.svc.getStats(orgId);
  }

  @Get()
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.svc.findAll(orgId, query);
  }

  @Get(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get purchase order detail' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Post()
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create purchase order — MANAGER+' })
  create(@OrgId() orgId: string, @CurrentUser() actor: any, @Body() dto: any) {
    return this.svc.create(orgId, actor.id, dto);
  }

  @Put(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update purchase order (PUT)' })
  updatePut(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(orgId, id, dto);
  }

  @Patch(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update purchase order (PATCH)' })
  updatePatch(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(orgId, id, dto);
  }

  @Post(':id/send')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Send purchase order to supplier (DRAFT → SENT)' })
  send(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.sendToSupplier(orgId, id);
  }

  @Post(':id/receive')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark purchase order as received — updates inventory' })
  receive(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: { items?: { productId: string; receivedQty: number }[]; notes?: string },
  ) {
    return this.svc.receive(orgId, id, dto);
  }

  @Delete(':id/cancel')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel purchase order — MANAGER+' })
  cancel(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.svc.cancel(orgId, id, reason);
  }
}
