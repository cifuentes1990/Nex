import { Module } from '@nestjs/common';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@Injectable()
class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      organizationId: orgId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: { comments: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  private normalize(data: any) {
    const { subject, category, ...rest } = data;
    return { ...rest, ...(subject && !rest.title ? { title: subject } : {}) };
  }

  create(orgId: string, userId: string, data: any) {
    return this.prisma.ticket.create({
      data: { ...this.normalize(data), status: 'OPEN', organizationId: orgId, createdBy: userId },
    });
  }

  update(id: string, data: any) {
    return this.prisma.ticket.update({ where: { id }, data: this.normalize(data) });
  }
}

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
class TicketsController {
  constructor(private s: TicketsService) {}
  @Get() findAll(@OrgId() o: string, @Query() q: any) { return this.s.findAll(o, q); }
  @Post() create(@OrgId() o: string, @CurrentUser() u: any, @Body() b: any) { return this.s.create(o, u.id, b); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: any) { return this.s.update(id, b); }
}

@Module({ controllers: [TicketsController], providers: [TicketsService] })
export class TicketsModule {}
