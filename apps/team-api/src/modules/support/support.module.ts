import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SupportService } from "./support.service";
import { SupportController } from "./support.controller";

@Module({
  imports: [PrismaModule],
  providers: [SupportService],
  controllers: [SupportController],
  exports: [SupportService],
})
export class SupportModule {}
