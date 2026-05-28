import { Module } from '@nestjs/common';
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { Cron } from '@nestjs/schedule';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

@Injectable()
class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private prisma: PrismaService) {}

  private toApiShape(a: any) {
    const actions = Array.isArray(a.actions) ? a.actions : [];
    const action = actions[0]?.type ?? (typeof a.actions === 'string' ? a.actions : '');
    return { ...a, action, executionCount: a.runCount ?? 0 };
  }

  private normalizeDto(dto: any) {
    const { action, conditions, ...rest } = dto;
    return {
      ...rest,
      ...(action !== undefined && { actions: [{ type: action }] }),
      ...(conditions !== undefined && { conditions: typeof conditions === 'string' ? [] : conditions }),
    };
  }

  async findAll(orgId: string) {
    const items = await this.prisma.automation.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((a) => this.toApiShape(a));
  }

  create(orgId: string, dto: any) {
    return this.prisma.automation.create({
      data: { ...this.normalizeDto(dto), organizationId: orgId },
    }).then((a) => this.toApiShape(a));
  }

  update(id: string, dto: any) {
    return this.prisma.automation.update({ where: { id }, data: this.normalizeDto(dto) })
      .then((a) => this.toApiShape(a));
  }

  delete(id: string) {
    return this.prisma.automation.delete({ where: { id } });
  }

  @Cron('0 20 * * *') // Daily at 8pm
  async runDailyAutomations() {
    this.logger.log('Running daily automations...');
    const automations = await this.prisma.automation.findMany({
      where: {
        isActive: true,
        trigger: { path: ['event'], equals: 'schedule' },
      },
    });
    this.logger.log(`Found ${automations.length} scheduled automations`);
    // Execute automation logic here
  }
}

@ApiTags('automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
class AutomationsController {
  constructor(private s: AutomationsService) {}
  @Get()       findAll(@OrgId() o: string)                          { return this.s.findAll(o); }
  @Post()      create(@OrgId() o: string, @Body() dto: any)         { return this.s.create(o, dto); }
  @Put(':id')  update(@Param('id') id: string, @Body() dto: any)    { return this.s.update(id, dto); }
  @Patch(':id') patch(@Param('id') id: string, @Body() dto: any)    { return this.s.update(id, dto); }
  @Delete(':id') delete(@Param('id') id: string)                    { return this.s.delete(id); }
}

@Module({ controllers: [AutomationsController], providers: [AutomationsService] })
export class AutomationsModule {}
