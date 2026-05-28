import { Module } from '@nestjs/common';
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import Stripe from 'stripe';

@Injectable()
class PaymentsService {
  private stripe: Stripe;
  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'), { apiVersion: '2024-04-10' });
  }

  async createStripeIntent(amount: number, currency = 'cop') {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      metadata: { platform: 'nexus-erp' },
    });
  }

  async getPaymentHistory(orgId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { organizationId: orgId },
        orderBy: { processedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where: { organizationId: orgId } }),
    ]);
    return { items, total, page, limit };
  }

  async getRevenueSummary(orgId: string) {
    const result = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { organizationId: orgId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });
    const byMethod = result.map((r) => ({
      method: r.method,
      total: r._sum.amount ?? 0,
      count: r._count,
    }));
    return { byMethod };
  }
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
class PaymentsController {
  constructor(private s: PaymentsService) {}
  @Get('history') getHistory(@OrgId() o: string, @Query() q: any) { return this.s.getPaymentHistory(o, q); }
  @Get('summary') getSummary(@OrgId() o: string) { return this.s.getRevenueSummary(o); }
  @Post('stripe/intent') createIntent(@Body() body: { amount: number }) { return this.s.createStripeIntent(body.amount); }
  @Public() @Post('stripe/webhook') handleWebhook(@Body() body: any) { return { received: true }; }
}

@Module({ controllers: [PaymentsController], providers: [PaymentsService] })
export class PaymentsModule {}
