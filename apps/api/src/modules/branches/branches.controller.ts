import {
  Controller, Get, Post, Put, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches in organization' })
  findAll(@OrgId() orgId: string) {
    return this.branchesService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch detail' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchesService.findOne(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get branch KPI summary' })
  getSummary(@OrgId() orgId: string, @Param('id') id: string) {
    return this.branchesService.getSummary(orgId, id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create new branch' })
  create(@OrgId() orgId: string, @Body() dto: any) {
    return this.branchesService.create(orgId, dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update branch' })
  update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.branchesService.update(orgId, id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Toggle branch active status' })
  setActive(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.branchesService.setActive(orgId, id, isActive);
  }
}
