import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ReviewTrackerService } from "./review-tracker.service";
import { ReviewTrackerController } from "./review-tracker.controller";

@Module({
  imports: [PrismaModule],
  providers: [ReviewTrackerService],
  controllers: [ReviewTrackerController],
  exports: [ReviewTrackerService],
})
export class ReviewTrackerModule {}
