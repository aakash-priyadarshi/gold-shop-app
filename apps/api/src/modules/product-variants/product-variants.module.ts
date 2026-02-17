import { Module } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import {
  ProductVariantsController,
  SizeChartsController,
} from './product-variants.controller';

@Module({
  controllers: [ProductVariantsController, SizeChartsController],
  providers: [ProductVariantsService],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
