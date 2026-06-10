import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OnlineStoreService } from './online-store.service';

@ApiTags('storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private svc: OnlineStoreService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public store info by slug' })
  getStore(@Param('slug') slug: string) {
    return this.svc.getPublicStore(slug);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Get public product catalog' })
  getProducts(
    @Param('slug') slug: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getPublicProducts(slug, { category, search, page, limit });
  }

  @Get(':slug/categories')
  @ApiOperation({ summary: 'Get categories that have active products' })
  getCategories(@Param('slug') slug: string) {
    return this.svc.getPublicCategories(slug);
  }

  @Get(':slug/shipping')
  @ApiOperation({ summary: 'Calculate shipping cost for city + total' })
  getShipping(
    @Param('slug') slug: string,
    @Query('city') city: string,
    @Query('total') total: string,
  ) {
    return this.svc.getPublicShipping(slug, city, Number(total ?? 0));
  }

  @Post(':slug/orders')
  @ApiOperation({ summary: 'Place a guest order (no auth required)' })
  createOrder(@Param('slug') slug: string, @Body() dto: any) {
    return this.svc.createGuestOrder(slug, dto);
  }
}
