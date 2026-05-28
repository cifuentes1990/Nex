import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API health check' })
  health() {
    return {
      name: 'Nexus ERP API',
      version: '1.0.0',
      status: 'ok',
      timestamp: new Date().toISOString(),
      docs: 'http://localhost:4000/api/docs',
    };
  }
}
