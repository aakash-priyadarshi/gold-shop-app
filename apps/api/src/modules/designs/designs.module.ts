import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DesignsController } from "./designs.controller";
import { DesignsService } from "./designs.service";
import { ImageGenerationService } from "./image-generation.service";

@Module({
  imports: [AuditModule],
  controllers: [DesignsController],
  providers: [DesignsService, ImageGenerationService],
  exports: [DesignsService, ImageGenerationService],
})
export class DesignsModule {}
