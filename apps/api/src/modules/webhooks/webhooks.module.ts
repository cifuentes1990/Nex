import { Module } from '@nestjs/common';
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
class WebhooksService {
  constructor(private prisma: PrismaService) {}

  findAll(orgId: string) {
    return this.prisma.webhook.findMany({ where: { organizationId: orgId } });
  }

  create(orgId: string, dto: any) {
    return this.prisma.webhook.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        url: dto.url,
        secret: crypto.randomBytes(32).toString('hex'),
        events: dto.events ?? [],
        isActive: true,
      },
    });
  }

  delete(id: string) {
    return this.prisma.webhook.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
class WebhooksController {
  constructor(private s: WebhooksService) {}
  @Get() findAll(@OrgId() o: string) { return this.s.findAll(o); }
  @Post() create(@OrgId() o: string, @Body() dto: any) { return this.s.create(o, dto); }
  @Delete(':id') delete(@Param('id') id: string) { return this.s.delete(id); }
}

@Module({ controllers: [WebhooksController], providers: [WebhooksService] })
export class WebhooksModule {}
