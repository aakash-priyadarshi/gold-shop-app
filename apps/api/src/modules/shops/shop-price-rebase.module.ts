import { Module } from "@nestjs/common";
import { FxRatesModule } from "../fx-rates";
import { ShopPriceRebaseService } from "./shop-price-rebase.service";

@Module({
  imports: [FxRatesModule],
  providers: [ShopPriceRebaseService],
  exports: [ShopPriceRebaseService],
})
export class ShopPriceRebaseModule {}
