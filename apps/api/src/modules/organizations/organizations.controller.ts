import { Controller, Get, Put, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization details' })
  getMe(@OrgId() orgId: string) {
    return this.orgsService.findOne(orgId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update organization settings (PUT)' })
  update(@OrgId() orgId: string, @Body() dto: any) {
    return this.orgsService.update(orgId, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update organization settings (PATCH)' })
  partialUpdate(@OrgId() orgId: string, @Body() dto: any) {
    return this.orgsService.update(orgId, dto);
  }

  @Get('branches')
  @ApiOperation({ summary: 'Get all branches' })
  getBranches(@OrgId() orgId: string) {
    return this.orgsService.getBranches(orgId);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create new branch' })
  createBranch(@OrgId() orgId: string, @Body() dto: any) {
    return this.orgsService.createBranch(orgId, dto);
  }
}
