import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPIs and stats' })
  @ApiQuery({ name: 'branchId', required: false })
  getDashboard(@OrgId() orgId: string, @Query('branchId') branchId?: string) {
    return this.analyticsService.getDashboardStats(orgId, branchId);
  }

  @Get('sales-by-day')
  @ApiOperation({ summary: 'Sales grouped by day' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getSalesByDay(
    @OrgId() orgId: string,
    @Query('branchId') branchId?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.analyticsService.getSalesByDay(orgId, branchId, days);
  }

  @Get('sales-by-hour')
  @ApiOperation({ summary: 'Sales grouped by hour (today)' })
  getSalesByHour(@OrgId() orgId: string, @Query('branchId') branchId?: string) {
    return this.analyticsService.getSalesByHour(orgId, branchId);
  }

  @Get('revenue-by-category')
  @ApiOperation({ summary: 'Revenue breakdown by product category' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'year'], required: false })
  getRevenueByCategory(
    @OrgId() orgId: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    return this.analyticsService.getRevenueByCategory(orgId, period);
  }

  @Get('customer-segments')
  @ApiOperation({ summary: 'RFM customer segmentation' })
  getCustomerSegments(@OrgId() orgId: string) {
    return this.analyticsService.getCustomerSegments(orgId);
  }

  @Get('profit')
  @ApiOperation({ summary: 'Profit & margin analysis' })
  getProfitAnalysis(
    @OrgId() orgId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.analyticsService.getProfitAnalysis(orgId, start, end);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'AI-powered sales forecasting' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  getForecast(
    @OrgId() orgId: string,
    @Query('daysAhead', new DefaultValuePipe(30), ParseIntPipe) daysAhead: number,
  ) {
    return this.analyticsService.getSalesForecasting(orgId, daysAhead);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Sales breakdown by channel (POS vs Online vs WhatsApp...)' })
  getSalesByChannel(
    @OrgId() orgId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getSalesByChannel(orgId, days);
  }

  @Get('online-orders/pending')
  @ApiOperation({ summary: 'Pending online orders pipeline' })
  getPendingOnlineOrders(@OrgId() orgId: string) {
    return this.analyticsService.getPendingOnlineOrders(orgId);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top performing products by revenue & profit' })
  getTopProducts(
    @OrgId() orgId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('period', new DefaultValuePipe(30), ParseIntPipe) period: number,
  ) {
    return this.analyticsService.getTopPerformingProducts(orgId, limit, period);
  }
}
