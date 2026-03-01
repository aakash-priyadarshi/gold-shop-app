import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "@prisma/client";
import { SmokeTestReport, TestingService } from "./testing.service";

@Controller("testing")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  /** GET /api/testing/smoke — Run smoke tests */
  @Get("smoke")
  async runSmokeTests(): Promise<SmokeTestReport> {
    return this.testingService.runSmokeTests();
  }

  /** POST /api/testing/smoke — Also trigger via POST */
  @Post("smoke")
  async triggerSmokeTests(): Promise<SmokeTestReport> {
    return this.testingService.runSmokeTests();
  }

  /** GET /api/testing/git — Git commit info */
  @Get("git")
  getGitInfo(): Record<string, string> {
    return this.testingService.getGitInfo();
  }

  /** GET /api/testing/runtime — Runtime diagnostics */
  @Get("runtime")
  getRuntimeInfo(): Record<string, unknown> {
    return this.testingService.getRuntimeInfo();
  }
}
