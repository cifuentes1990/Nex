import { Module } from '@nestjs/common';
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as crypto from 'crypto';

@Injectable()
class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  findAll(orgId: string) {
    return this.prisma.aPIKey.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, keyPrefix: true, isActive: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }).then((items) => ({ items }));
  }

  create(orgId: string, name: string) {
    const raw = crypto.randomBytes(32).toString('hex');
    const keyPrefix = raw.substring(0, 8);
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
    return this.prisma.aPIKey.create({
      data: { name, keyHash, keyPrefix, organizationId: orgId },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    }).then((k) => ({ ...k, key: `nexus_${raw}` }));
  }

  async revoke(id: string, orgId: string) {
    return this.prisma.aPIKey.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    });
  }
}

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
class ApiKeysController {
  constructor(private s: ApiKeysService) {}
  @Get() findAll(@OrgId() o: string) { return this.s.findAll(o); }
  @Post() create(@OrgId() o: string, @Body('name') name: string) { return this.s.create(o, name); }
  @Delete(':id') revoke(@Param('id') id: string, @OrgId() o: string) { return this.s.revoke(id, o); }
}

@Module({ controllers: [ApiKeysController], providers: [ApiKeysService] })
export class ApiKeysModule {}
