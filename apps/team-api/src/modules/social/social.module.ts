import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SocialService } from "./social.service";
import { SocialController } from "./social.controller";

@Module({
  imports: [PrismaModule],
  providers: [SocialService],
  controllers: [SocialController],
  exports: [SocialService],
})
export class SocialModule {}
