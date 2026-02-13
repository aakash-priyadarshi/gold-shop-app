import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PricingModule } from "../pricing/pricing.module";
import { MaterialsController } from "./materials.controller";
import { MaterialsService } from "./materials.service";

@Module({
  imports: [PrismaModule, PricingModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
