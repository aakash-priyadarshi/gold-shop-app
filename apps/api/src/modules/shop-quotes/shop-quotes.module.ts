import { Module } from '@nestjs/common';
import { ShopQuotesController } from './shop-quotes.controller';
import { ShopQuotesService } from './shop-quotes.service';

@Module({
  controllers: [ShopQuotesController],
  providers: [ShopQuotesService],
  exports: [ShopQuotesService],
})
export class ShopQuotesModule {}
