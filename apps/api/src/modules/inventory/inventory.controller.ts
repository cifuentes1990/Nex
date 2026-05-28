import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory with stock levels' })
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.inventoryService.findAll(orgId, query);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStock(@OrgId() orgId: string) {
    return this.inventoryService.getLowStockAlerts(orgId);
  }

  @Get('low-stock-alerts')
  @ApiOperation({ summary: 'Get low stock alerts (alias)' })
  getLowStockAlerts(@OrgId() orgId: string) {
    return this.inventoryService.getLowStockAlerts(orgId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movements history' })
  getMovements(@OrgId() orgId: string, @Query('productId') productId?: string) {
    return this.inventoryService.getStockMovements(orgId, productId);
  }

  @Post(':productId/adjust')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Manual stock adjustment — MANAGER+' })
  adjust(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.adjustStock(orgId, productId, dto, actor.id);
  }
}
