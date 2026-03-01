import { Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "@prisma/client";
import {
  E2EReport,
  IntegrationReport,
  SmokeTestReport,
  TestRunHistoryEntry,
  TestingService,
} from "./testing.service";

@Controller("testing")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  // ── Smoke Tests ────────────────────────────────────────

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

  // ── E2E (Playwright) ──────────────────────────────────

  /** POST /api/testing/e2e — Run Playwright E2E tests */
  @Post("e2e")
  async runE2ETests(): Promise<E2EReport> {
    return this.testingService.runE2ETests();
  }

  /** GET /api/testing/e2e — Get latest E2E report */
  @Get("e2e")
  getLatestE2EReport(): E2EReport | null {
    return this.testingService.getLatestE2EReport();
  }

  // ── Integration Tests (Jest) ──────────────────────────

  /** POST /api/testing/integration — Run Jest integration tests */
  @Post("integration")
  async runIntegrationTests(): Promise<IntegrationReport> {
    return this.testingService.runIntegrationTests();
  }

  /** GET /api/testing/integration — Get latest integration report */
  @Get("integration")
  getLatestIntegrationReport(): IntegrationReport | null {
    return this.testingService.getLatestIntegrationReport();
  }

  // ── History ───────────────────────────────────────────

  /** GET /api/testing/history — Get test run history */
  @Get("history")
  getTestHistory(): TestRunHistoryEntry[] {
    return this.testingService.getTestHistory();
  }

  /** DELETE /api/testing/history — Clear test history */
  @Delete("history")
  clearTestHistory(): { success: boolean } {
    this.testingService.clearTestHistory();
    return { success: true };
  }

  // ── Info ──────────────────────────────────────────────

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
