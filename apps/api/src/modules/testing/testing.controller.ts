import { Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CIStatus,
  CITriggerResult,
  CIWorkflowRun,
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

  /** POST /api/testing/e2e — Run E2E tests (triggers CI on production) */
  @Post("e2e")
  async runE2ETests(): Promise<E2EReport | CITriggerResult> {
    return this.testingService.runE2ETests();
  }

  /** GET /api/testing/e2e — Get latest E2E report */
  @Get("e2e")
  getLatestE2EReport(): E2EReport | null {
    return this.testingService.getLatestE2EReport();
  }

  // ── Integration Tests (Jest) ──────────────────────────

  /** POST /api/testing/integration — Run integration tests (triggers CI on production) */
  @Post("integration")
  async runIntegrationTests(): Promise<IntegrationReport | CITriggerResult> {
    return this.testingService.runIntegrationTests();
  }

  /** GET /api/testing/integration — Get latest integration report */
  @Get("integration")
  getLatestIntegrationReport(): IntegrationReport | null {
    return this.testingService.getLatestIntegrationReport();
  }

  // ── GitHub Actions CI ─────────────────────────────────

  /** GET /api/testing/ci/status — Get CI configuration and latest runs */
  @Get("ci/status")
  async getCIStatus(): Promise<CIStatus> {
    return this.testingService.getCIStatus();
  }

  /** POST /api/testing/ci/trigger — Trigger the CI test workflow */
  @Post("ci/trigger")
  async triggerCI(
    @Query("branch") branch?: string,
  ): Promise<CITriggerResult> {
    return this.testingService.triggerCIWorkflow(branch || "master");
  }

  /** GET /api/testing/ci/runs — Get recent CI workflow runs */
  @Get("ci/runs")
  async getCIRuns(
    @Query("limit") limit?: string,
  ): Promise<CIWorkflowRun[]> {
    return this.testingService.getCIRuns(
      Math.min(Number(limit) || 10, 30),
    );
  }

  /** GET /api/testing/ci/runs/:id — Get details of a specific CI run */
  @Get("ci/runs/:id")
  async getCIRunDetail(
    @Param("id") id: string,
  ): Promise<CIWorkflowRun> {
    return this.testingService.getCIRunDetail(Number(id));
  }

  /** POST /api/testing/ci/runs/:id/rerun — Re-run a failed workflow */
  @Post("ci/runs/:id/rerun")
  async rerunCI(@Param("id") id: string): Promise<CITriggerResult> {
    return this.testingService.rerunCIWorkflow(Number(id));
  }

  /** POST /api/testing/ci/runs/:id/cancel — Cancel a running workflow */
  @Post("ci/runs/:id/cancel")
  async cancelCI(@Param("id") id: string): Promise<CITriggerResult> {
    return this.testingService.cancelCIWorkflow(Number(id));
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
