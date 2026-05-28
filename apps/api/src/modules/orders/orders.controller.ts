import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Roles('CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new order (POS sale)' })
  create(@OrgId() orgId: string, @CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(orgId, user.branchId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with filters' })
  findAll(@OrgId() orgId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.ordersService.findOne(orgId, id);
  }

  @Patch(':id/status')
  @Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update online order status — SUPERVISOR+' })
  updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string; trackingNumber?: string; courierName?: string; internalNote?: string },
  ) {
    return this.ordersService.updateStatus(orgId, id, body.status, body);
  }

  @Delete(':id/cancel')
  @Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order — SUPERVISOR+' })
  cancel(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.cancel(orgId, id, reason ?? 'Cancelled by user');
  }
}
