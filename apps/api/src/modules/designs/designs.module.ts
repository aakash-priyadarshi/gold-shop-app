import { Module } from '@nestjs/common';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { ImageGenerationService } from './image-generation.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DesignsController],
  providers: [DesignsService, ImageGenerationService],
  exports: [DesignsService, ImageGenerationService],
})
export class DesignsModule {}
