import * as Sentry from '@sentry/nestjs';

// Sentry debe inicializarse ANTES de crear la app para capturar todos los errores
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    release: process.env.npm_package_version,
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('NexusERP');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  // Security
  app.use(helmet.default());
  app.use(compression());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: config.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-organization-id'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // WebSockets
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // permite campos extra (controladores usan @Body() dto: any)
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nexus ERP API')
      .setDescription('Enterprise SaaS/POS/ERP Platform API — Powered by AI')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Management')
      .addTag('organizations', 'Organization & Branches')
      .addTag('products', 'Product Catalog')
      .addTag('inventory', 'Inventory Management')
      .addTag('orders', 'Orders & POS')
      .addTag('invoices', 'Invoicing & Billing')
      .addTag('customers', 'CRM & Customers')
      .addTag('analytics', 'Analytics & BI')
      .addTag('ai', 'AI Assistant & Insights')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  logger.log(`🚀 Nexus ERP API running on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
  if (process.env.SENTRY_DSN) {
    logger.log(`🔍 Sentry monitoreo activo (${process.env.NODE_ENV})`);
  } else {
    logger.warn(`⚠️  Sentry no configurado — agrega SENTRY_DSN en .env para monitoreo en producción`);
  }
}

bootstrap();
