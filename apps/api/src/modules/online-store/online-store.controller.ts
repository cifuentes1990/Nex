import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OnlineStoreService } from './online-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('online-store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('online-store')
export class OnlineStoreController {
  constructor(private svc: OnlineStoreService) {}

  // ── Tienda ───────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get online store settings' })
  getStore(@OrgId() orgId: string) {
    return this.svc.getStore(orgId);
  }

  @Put()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update online store settings (PUT)' })
  updateStorePut(@OrgId() orgId: string, @Body() dto: any) {
    return this.svc.updateStore(orgId, dto);
  }

  @Patch()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update online store settings (PATCH)' })
  updateStorePatch(@OrgId() orgId: string, @Body() dto: any) {
    return this.svc.updateStore(orgId, dto);
  }

  // ── Zonas de envío ───────────────────────────────────────────────────
  @Get('shipping-zones')
  @ApiOperation({ summary: 'List shipping zones' })
  getZones(@OrgId() orgId: string) {
    return this.svc.getShippingZones(orgId);
  }

  @Post('shipping-zones')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create shipping zone — ADMIN+' })
  createZone(@OrgId() orgId: string, @Body() dto: any) {
    return this.svc.createShippingZone(orgId, dto);
  }

  @Put('shipping-zones/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update shipping zone (PUT)' })
  updateZonePut(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateShippingZone(orgId, id, dto);
  }

  @Patch('shipping-zones/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update shipping zone (PATCH)' })
  updateZonePatch(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateShippingZone(orgId, id, dto);
  }

  @Delete('shipping-zones/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete shipping zone — ADMIN+' })
  deleteZone(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.deleteShippingZone(orgId, id);
  }

  // ── Cálculo de envío ─────────────────────────────────────────────────
  @Get('calculate-shipping')
  @ApiOperation({ summary: 'Calculate shipping cost for a city + order total' })
  calculateShipping(
    @OrgId() orgId: string,
    @Query('city') city: string,
    @Query('orderTotal') orderTotal: string,
  ) {
    return this.svc.calculateShipping(orgId, city, Number(orderTotal ?? 0));
  }
}
