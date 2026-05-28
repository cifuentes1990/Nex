import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ── Perfil propio ─────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser() actor: any,
    @OrgId() orgId: string,
    @Body() dto: any,
  ) {
    return this.usersService.update(orgId, actor.id, actor.role, actor.id, dto);
  }

  // ── Leaderboard ───────────────────────────────────────────────────────
  @Get('leaderboard')
  @ApiOperation({ summary: 'Sales leaderboard / gamification ranking' })
  getLeaderboard(
    @OrgId() orgId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.usersService.getLeaderboard(orgId, branchId);
  }

  // ── CRUD usuarios ─────────────────────────────────────────────────────
  @Get()
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List users in organization' })
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.usersService.findAll(orgId, query);
  }

  @Get(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user profile' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.usersService.findOne(orgId, id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create / invite new user' })
  create(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Body() dto: any,
  ) {
    return this.usersService.create(orgId, actor.role, dto, actor.id);
  }

  @Put(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user' })
  update(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.usersService.update(orgId, actor.id, actor.role, id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Activate / deactivate / suspend user' })
  setStatus(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  ) {
    return this.usersService.setStatus(orgId, actor.id, actor.role, id, status);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Soft-delete user (sets INACTIVE)' })
  remove(
    @OrgId() orgId: string,
    @CurrentUser() actor: any,
    @Param('id') id: string,
  ) {
    return this.usersService.delete(orgId, actor.id, actor.role, id);
  }
}
