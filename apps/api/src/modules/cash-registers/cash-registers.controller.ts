import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CashRegistersService } from './cash-registers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('cash-registers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private svc: CashRegistersService) {}

  @Get()
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List cash registers' })
  findAll(
    @OrgId() orgId: string,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.svc.findAll(orgId, branchId, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my open register' })
  getMyRegister(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Query('branchId') branchId?: string,
  ) {
    return this.svc.getMyRegister(orgId, actor.id, branchId ?? actor.branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get register detail' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Current shift summary' })
  getSummary(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.getSummary(orgId, id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create cash register' })
  create(@OrgId() orgId: string, @Body() dto: any) {
    return this.svc.create(orgId, dto);
  }

  @Patch(':id/open')
  @ApiOperation({ summary: 'Open a cash register' })
  open(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('id') id: string,
    @Body('openingBalance') openingBalance: number,
  ) {
    return this.svc.open(orgId, id, actor.id, openingBalance ?? 0);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a cash register' })
  close(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('closingBalance') closingBalance: number,
    @Body('notes') notes?: string,
  ) {
    return this.svc.close(orgId, id, closingBalance ?? 0, notes);
  }
}
