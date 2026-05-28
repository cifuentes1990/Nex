import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AIModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ApiKeysModule } from './modules/apikeys/apikeys.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CashRegistersModule } from './modules/cash-registers/cash-registers.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PrismaModule } from './config/prisma.module';
import { AppGateway } from './gateways/app.gateway';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL', 'redis://localhost:6379'),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    InvoicesModule,
    CustomersModule,
    SuppliersModule,
    AnalyticsModule,
    AIModule,
    NotificationsModule,
    AutomationsModule,
    PaymentsModule,
    ReportsModule,
    WebhooksModule,
    CategoriesModule,
    ApiKeysModule,
    ExpensesModule,
    TicketsModule,
    BranchesModule,
    CashRegistersModule,
    AuditLogsModule,
  ],
  providers: [AppGateway],
})
export class AppModule {}
