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
import { SocialService } from "./social.service";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("social")
export class SocialController {
  constructor(private svc: SocialService) {}

  /* ─── ACCOUNTS ─── */

  @Post("accounts")
  @Roles("ADMIN")
  connectAccount(@Body() body: any) {
    return this.svc.connectAccount(body);
  }

  @Get("accounts")
  listAccounts() {
    return this.svc.listAccounts();
  }

  @Put("accounts/:id")
  @Roles("ADMIN")
  updateAccount(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateAccount(id, body);
  }

  @Patch("accounts/:id/disconnect")
  @Roles("ADMIN")
  disconnectAccount(@Param("id") id: string) {
    return this.svc.disconnectAccount(id);
  }

  /* ─── POSTS ─── */

  @Post("posts")
  createPost(@Body() body: any) {
    return this.svc.createPost(body);
  }

  @Get("posts")
  listPosts(
    @Query("accountId") accountId?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listPosts({ accountId, status });
  }

  @Get("posts/scheduled")
  getScheduledPosts() {
    return this.svc.getScheduledPosts();
  }

  @Get("posts/:id")
  getPost(@Param("id") id: string) {
    return this.svc.getPost(id);
  }

  @Put("posts/:id")
  updatePost(@Param("id") id: string, @Body() body: any) {
    return this.svc.updatePost(id, body);
  }

  @Patch("posts/:id/approve")
  @Roles("ADMIN")
  approvePost(@Param("id") id: string, @CurrentUser() user: any) {
    return this.svc.approvePost(id, user.id);
  }

  @Patch("posts/:id/publish")
  @Roles("ADMIN")
  publishPost(@Param("id") id: string) {
    return this.svc.publishPost(id);
  }

  @Delete("posts/:id")
  deletePost(@Param("id") id: string) {
    return this.svc.deletePost(id);
  }

  /* ─── ANALYTICS ─── */

  @Post("analytics/:accountId")
  recordAccountAnalytics(
    @Param("accountId") accountId: string,
    @Body() body: { date: string } & Record<string, any>,
  ) {
    const { date, ...data } = body;
    return this.svc.recordAccountAnalytics(accountId, date, data);
  }

  @Get("analytics/dashboard")
  getAnalyticsDashboard() {
    return this.svc.getAnalyticsDashboard();
  }
}
