import {
  Controller, Post, Get, Body, Param, Delete,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser, OrgId } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChatDto {
  @ApiProperty() @IsString()
  message: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  conversationId?: string;
}

class GenerateDescriptionDto {
  @ApiProperty() @IsString()
  name: string;
  @ApiPropertyOptional() @IsOptional() @IsString()
  category?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN')
@Controller('ai')
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with the AI Business Assistant' })
  chat(@OrgId() orgId: string, @CurrentUser() user: any, @Body() dto: ChatDto) {
    return this.aiService.chat(orgId, user.id, dto.conversationId ?? null, dto.message);
  }

  @Post('insights/generate')
  @ApiOperation({ summary: 'Generate AI business insights' })
  generateInsights(@OrgId() orgId: string) {
    return this.aiService.generateInsights(orgId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get current AI insights' })
  getInsights(@OrgId() orgId: string) {
    return this.aiService.getInsights(orgId);
  }

  @Delete('insights/:id')
  @ApiOperation({ summary: 'Dismiss an AI insight' })
  dismissInsight(@Param('id') id: string, @OrgId() orgId: string) {
    return this.aiService.dismissInsight(id, orgId);
  }

  @Post('products/description')
  @ApiOperation({ summary: 'Generate AI product description' })
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateProductDescription(dto);
  }

  @Get('predict-demand/:productId')
  @ApiOperation({ summary: 'Predict product demand & stockout risk' })
  predictDemand(@OrgId() orgId: string, @Param('productId') productId: string) {
    return this.aiService.predictDemand(orgId, productId);
  }

  @Post('promotions/generate')
  @ApiOperation({ summary: 'Auto-generate a promotion campaign' })
  generatePromotion(
    @OrgId() orgId: string,
    @Query('type') type: 'slow_products' | 'seasonal' | 'vip' = 'seasonal',
  ) {
    return this.aiService.generatePromotion(orgId, type);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Detect fraud and order anomalies' })
  detectAnomalies(@OrgId() orgId: string) {
    return this.aiService.detectAnomalies(orgId);
  }
}
