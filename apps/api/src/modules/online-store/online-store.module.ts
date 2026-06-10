import { Module } from '@nestjs/common';
import { OnlineStoreController } from './online-store.controller';
import { StorefrontController } from './storefront.controller';
import { OnlineStoreService } from './online-store.service';

@Module({
  controllers: [OnlineStoreController, StorefrontController],
  providers: [OnlineStoreService],
  exports: [OnlineStoreService],
})
export class OnlineStoreModule {}
