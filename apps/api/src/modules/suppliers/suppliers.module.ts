import { Module } from '@nestjs/common';
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@Injectable()
class SuppliersService {
  constructor(private prisma: PrismaService) {}
  findAll(orgId: string, query: any) {
    return this.prisma.supplier.findMany({ where: { organizationId: orgId, isActive: true }, include: { _count: { select: { products: true, purchaseOrders: true } } }, orderBy: { name: 'asc' } });
  }
  findOne(orgId: string, id: string) {
    return this.prisma.supplier.findFirst({ where: { id, organizationId: orgId }, include: { products: { take: 10 }, purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } } } });
  }
  create(orgId: string, dto: any) {
    return this.prisma.supplier.create({ data: { ...dto, organizationId: orgId } });
  }
  update(id: string, orgId: string, dto: any) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }
  remove(id: string, orgId: string) {
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
class SuppliersController {
  constructor(private s: SuppliersService) {}
  @Get() findAll(@OrgId() o: string, @Query() q: any) { return this.s.findAll(o, q); }
  @Get(':id') findOne(@OrgId() o: string, @Param('id') id: string) { return this.s.findOne(o, id); }
  @Post() @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN') create(@OrgId() o: string, @Body() dto: any) { return this.s.create(o, dto); }
  @Put(':id') @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN') updatePut(@OrgId() o: string, @Param('id') id: string, @Body() dto: any) { return this.s.update(id, o, dto); }
  @Patch(':id') @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN') update(@OrgId() o: string, @Param('id') id: string, @Body() dto: any) { return this.s.update(id, o, dto); }
  @Delete(':id') @Roles('ADMIN', 'SUPER_ADMIN') remove(@OrgId() o: string, @Param('id') id: string) { return this.s.remove(id, o); }
}

@Module({ controllers: [SuppliersController], providers: [SuppliersService], exports: [SuppliersService] })
export class SuppliersModule {}
