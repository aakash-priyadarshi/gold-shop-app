import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CustomerCrmController } from "./customer-crm.controller";
import { CustomerCrmService } from "./customer-crm.service";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerCrmController],
  providers: [CustomerCrmService],
  exports: [CustomerCrmService],
})
export class CustomerCrmModule {}
