import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SecurityService } from "./security.service";

@Controller("security")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  /** Full security dashboard data */
  @Get("dashboard")
  async getDashboard() {
    return this.securityService.getDashboard();
  }

  /** Paginated security events */
  @Get("events")
  async getEvents(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
    @Query("severity") severity?: string,
    @Query("ip") ip?: string,
  ) {
    return this.securityService.getEvents({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      type,
      severity,
      ip,
    });
  }

  /** List currently blocked IPs */
  @Get("blocked-ips")
  async getBlockedIps() {
    return this.securityService.getBlockedIps();
  }

  /** Manually block an IP */
  @Post("block")
  @HttpCode(HttpStatus.OK)
  async blockIp(
    @Body() body: { ip: string; reason: string; durationMinutes?: number },
  ) {
    const duration = body.durationMinutes
      ? body.durationMinutes * 60 * 1000
      : undefined;
    await this.securityService.blockIp(
      body.ip,
      body.reason || "Manual admin block",
      "HIGH",
      false,
      duration,
    );
    return { success: true, message: `IP ${body.ip} blocked` };
  }

  /** Unblock an IP */
  @Delete("unblock/:ip")
  @HttpCode(HttpStatus.OK)
  async unblockIp(@Param("ip") ip: string) {
    await this.securityService.unblockIp(ip);
    return { success: true, message: `IP ${ip} unblocked` };
  }

  /** Get threat profile for a specific IP */
  @Get("ip-profile/:ip")
  async getIpProfile(@Param("ip") ip: string) {
    const profile = this.securityService.getIpProfile(ip);
    const isBlocked = await this.securityService.isBlocked(ip);
    const isWhitelisted = await this.securityService.isWhitelisted(ip);
    return { ip, profile, isBlocked, isWhitelisted };
  }

  // ─── IP Whitelist ──────────────────────────────────────────

  /** List whitelisted IPs */
  @Get("whitelisted-ips")
  async getWhitelistedIps() {
    return this.securityService.getWhitelistedIps();
  }

  /** Whitelist an IP (also unblocks if blocked) */
  @Post("whitelist")
  @HttpCode(HttpStatus.OK)
  async whitelistIp(
    @Body() body: { ip: string; label?: string },
    @Req() req: any,
  ) {
    const addedBy = req.user?.id;
    await this.securityService.whitelistIp(body.ip, body.label || "", addedBy);
    return { success: true, message: `IP ${body.ip} whitelisted` };
  }

  /** Remove an IP from the whitelist */
  @Delete("whitelist/:ip")
  @HttpCode(HttpStatus.OK)
  async removeWhitelistedIp(@Param("ip") ip: string) {
    await this.securityService.removeWhitelistedIp(ip);
    return { success: true, message: `IP ${ip} removed from whitelist` };
  }
}
