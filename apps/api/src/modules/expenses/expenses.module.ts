import { Module } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@Injectable()
class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      organizationId: orgId,
      ...(search && { description: { contains: search, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  create(orgId: string, userId: string, data: any) {
    const amount = Number(data.amount);
    const taxAmount = Number(data.taxAmount ?? 0);
    return this.prisma.expense.create({
      data: {
        ...data,
        amount,
        taxAmount,
        total: amount + taxAmount,
        date: data.date ? new Date(data.date) : new Date(),
        organizationId: orgId,
        createdBy: userId,
      },
    });
  }

  update(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.amount !== undefined || data.taxAmount !== undefined) {
      const amount = Number(data.amount ?? 0);
      const taxAmount = Number(data.taxAmount ?? 0);
      updateData.amount = amount;
      updateData.taxAmount = taxAmount;
      updateData.total = amount + taxAmount;
    }
    return this.prisma.expense.update({ where: { id }, data: updateData });
  }

  remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
class ExpensesController {
  constructor(private s: ExpensesService) {}
  @Get() findAll(@OrgId() o: string, @Query() q: any) { return this.s.findAll(o, q); }
  @Post() create(@OrgId() o: string, @CurrentUser() u: any, @Body() b: any) { return this.s.create(o, u.id, b); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: any) { return this.s.update(id, b); }
  @Delete(':id') remove(@Param('id') id: string) { return this.s.remove(id); }
}

@Module({ controllers: [ExpensesController], providers: [ExpensesService] })
export class ExpensesModule {}
