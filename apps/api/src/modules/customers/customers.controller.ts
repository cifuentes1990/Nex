import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles('CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create customer — CASHIER+' })
  create(@OrgId() orgId: string, @Body() dto: any) {
    return this.customersService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers with CRM filters' })
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.customersService.findAll(orgId, query);
  }

  @Get('top')
  @Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Top customers by revenue — SUPERVISOR+' })
  getTop(@OrgId() orgId: string, @Query('limit') limit?: number) {
    return this.customersService.getTopCustomers(orgId, limit);
  }

  @Get('segments')
  @Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Customer segment analysis — SUPERVISOR+' })
  getSegments(@OrgId() orgId: string) {
    return this.customersService.getSegmentStats(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer profile with full history' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.customersService.findOne(orgId, id);
  }

  @Put(':id')
  @Roles('CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update customer — CASHIER+' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.update(orgId, id, dto);
  }

  @Patch(':id')
  @Roles('CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partial update customer — CASHIER+' })
  partialUpdate(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate customer — MANAGER+' })
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.customersService.remove(orgId, id);
  }

  @Post(':id/interactions')
  @Roles('CASHIER', 'EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Log customer interaction — CASHIER+' })
  addInteraction(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.addInteraction(orgId, id, dto);
  }
}
