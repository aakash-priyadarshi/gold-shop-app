import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";
import { ImageGenerationService } from "./image-generation.service";
import { DescriptionGeneratorService } from "./description-generator.service";

@Module({
  imports: [AuditModule, NotificationsModule, ConfigModule],
  controllers: [DesignsController],
  providers: [DesignsService, ImageGenerationService, DescriptionGeneratorService],
  exports: [DesignsService, ImageGenerationService, DescriptionGeneratorService],
})
export class DesignsModule {}
