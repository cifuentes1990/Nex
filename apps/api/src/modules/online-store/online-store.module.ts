import { Module } from '@nestjs/common';
import { OnlineStoreController } from './online-store.controller';
import { OnlineStoreService } from './online-store.service';

@Module({
  controllers: [OnlineStoreController],
  providers: [OnlineStoreService],
  exports: [OnlineStoreService],
})
export class OnlineStoreModule {}
