import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/guards/roles.guard';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create product' })
  create(@OrgId() orgId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products with filters & pagination' })
  findAll(@OrgId() orgId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(orgId, query);
  }

  @Get('winners')
  @ApiOperation({ summary: 'Top winner products by revenue + velocity' })
  getWinners(@OrgId() orgId: string, @Query('limit') limit?: number) {
    return this.productsService.getTopWinners(orgId, limit);
  }

  @Get('dead')
  @ApiOperation({ summary: 'Dead products (no sales in 30 days)' })
  getDeadProducts(@OrgId() orgId: string) {
    return this.productsService.getDeadProducts(orgId);
  }

  @Get('lookup/:sku')
  @ApiOperation({ summary: 'Lookup product by SKU or barcode (POS scanner)' })
  findBySku(@OrgId() orgId: string, @Param('sku') sku: string) {
    return this.productsService.findBySku(orgId, sku);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Put(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update product (PUT)' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(orgId, id, dto);
  }

  @Patch(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partial update product (PATCH)' })
  partialUpdate(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive/discontinue product' })
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.remove(orgId, id);
  }

  @Post('bulk-import')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk import products from CSV/Excel data' })
  bulkImport(@OrgId() orgId: string, @Body() body: { products: CreateProductDto[] }) {
    return this.productsService.bulkImport(orgId, body.products);
  }
}
