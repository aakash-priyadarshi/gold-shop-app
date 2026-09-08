import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SupportAccessService } from "./support-access.service";
import {
  ApproveSupportAccessDto,
  GrantSupportAccessDto,
  RequestSupportAccessDto,
} from "./support-access.dto";
import { SUPPORT_PERMISSIONS } from "./support-access.policy";

@Controller("support-access")
@UseGuards(JwtAuthGuard)
export class SupportAccessController {
  constructor(private readonly service: SupportAccessService) {}
  @Get("options") options(@Req() req: any) {
    this.service.realUser(req.user);
    return { permissions: SUPPORT_PERMISSIONS, recordingEnabled: false };
  }
  @Get("context/:conversationId") context(
    @Req() req: any,
    @Param("conversationId") id: string,
  ) {
    return this.service.context(req.user, id);
  }
  @Post("requests") request(
    @Req() req: any,
    @Body() dto: RequestSupportAccessDto,
  ) {
    return this.service.create(req.user, dto);
  }
  @Post("grants") grant(@Req() req: any, @Body() dto: GrantSupportAccessDto) {
    return this.service.create(req.user, dto, dto);
  }
  @Get("grants") list(@Req() req: any, @Query("conversationId") id?: string) {
    return this.service.list(req.user, id);
  }
  @Get("grants/:id") get(@Req() req: any, @Param("id") id: string) {
    return this.service.get(req.user, id);
  }
  @Get("grants/:id/activity") activity(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.activity(req.user, id);
  }
  @Post("grants/:id/approve") approve(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: ApproveSupportAccessDto,
  ) {
    return this.service.decide(req.user, id, "APPROVED", dto);
  }
  @Post("grants/:id/decline") decline(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.decide(req.user, id, "DECLINED");
  }
  @Post("grants/:id/revoke") revoke(@Req() req: any, @Param("id") id: string) {
    return this.service.decide(req.user, id, "REVOKED");
  }
  @Post("grants/:id/sessions") start(@Req() req: any, @Param("id") id: string) {
    return this.service.start(req.user, id);
  }
  @Get("session") session(@Req() req: any) {
    const session = req.supportAccess;
    if (!session) return null;
    return {
      id: session.id,
      expiresAt: session.expiresAt,
      grantExpiresAt: session.grant.expiresAt,
      shopName: session.grant.shop.shopName,
      adminName: `${session.grant.admin.firstName} ${session.grant.admin.lastName}`,
      permissions: session.grant.permissions,
      recordingEnabled: false,
    };
  }
  @Post("session/end") end(@Req() req: any) {
    return req.supportAccess
      ? this.service.end(req.supportAccess)
      : { success: true };
  }
  @Post("session/activity") activityPing() {
    return { success: true };
  }
}
