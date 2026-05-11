import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { PricingModule } from "../pricing/pricing.module";
import { ShopQuotesController } from "./shop-quotes.controller";
import { ShopQuotesService } from "./shop-quotes.service";

@Module({
  imports: [PricingModule, MailModule],
  controllers: [ShopQuotesController],
  providers: [ShopQuotesService],
  exports: [ShopQuotesService],
})
export class ShopQuotesModule {}
