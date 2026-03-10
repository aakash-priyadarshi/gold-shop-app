import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ReviewTrackerService } from "./review-tracker.service";
import { Roles } from "../../auth/roles.decorator";

@Controller("review-tracker")
export class ReviewTrackerController {
  constructor(private svc: ReviewTrackerService) {}

  /* ─── TRACKERS ─── */

  @Post("trackers")
  @Roles("ADMIN")
  createTracker(@Body() body: any) {
    return this.svc.createTracker(body);
  }

  @Get("trackers")
  listTrackers() {
    return this.svc.listTrackers();
  }

  @Get("trackers/:id")
  getTracker(@Param("id") id: string) {
    return this.svc.getTracker(id);
  }

  @Put("trackers/:id")
  @Roles("ADMIN")
  updateTracker(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateTracker(id, body);
  }

  @Delete("trackers/:id")
  @Roles("ADMIN")
  deleteTracker(@Param("id") id: string) {
    return this.svc.deleteTracker(id);
  }

  /* ─── REVIEWS ─── */

  @Post("reviews")
  addReview(@Body() body: any) {
    return this.svc.addReview(body);
  }

  @Get("reviews")
  listReviews(
    @Query("trackerId") trackerId?: string,
    @Query("sentiment") sentiment?: string,
    @Query("minRating") minRating?: string,
    @Query("maxRating") maxRating?: string,
    @Query("needsResponse") needsResponse?: string,
  ) {
    return this.svc.listReviews({
      trackerId,
      sentiment,
      minRating: minRating ? parseInt(minRating) : undefined,
      maxRating: maxRating ? parseInt(maxRating) : undefined,
      needsResponse: needsResponse === "true",
    });
  }

  @Get("reviews/:id")
  getReview(@Param("id") id: string) {
    return this.svc.getReview(id);
  }

  @Patch("reviews/:id/responded")
  markResponded(@Param("id") id: string) {
    return this.svc.markResponded(id);
  }

  /* ─── RESPONSES ─── */

  @Post("reviews/:reviewId/responses")
  draftResponse(@Param("reviewId") reviewId: string, @Body() body: any) {
    return this.svc.draftResponse(reviewId, body);
  }

  @Patch("responses/:id/approve")
  @Roles("ADMIN")
  approveResponse(@Param("id") id: string) {
    return this.svc.approveResponse(id);
  }

  @Patch("responses/:id/publish")
  @Roles("ADMIN")
  publishResponse(@Param("id") id: string) {
    return this.svc.publishResponse(id);
  }

  /* ─── DASHBOARD ─── */

  @Get("dashboard")
  getDashboard() {
    return this.svc.getDashboard();
  }
}
