import { Injectable, Logger } from "@nestjs/common";
import { execSync } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import { URL } from "url";
import { PrismaService } from "../../prisma/prisma.service";

export interface SmokeTestResult {
  name: string;
  category: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  message?: string;
  expected?: string;
  actual?: string;
}

export interface SmokeTestReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  categories: { name: string; passed: number; failed: number; total: number }[];
  results: SmokeTestResult[];
}

export interface TestRunHistoryEntry {
  id: string;
  type: "smoke" | "e2e" | "integration" | "full" | "ci";
  timestamp: string;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  trigger: "manual" | "ci" | "scheduled";
  branch: string;
  commit: string;
}

export interface E2EReport {
  timestamp: string;
  browser: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: E2ESuite[];
  htmlReportPath?: string;
}

export interface E2ESuite {
  name: string;
  file: string;
  tests: E2ETestCase[];
  duration: number;
}

export interface E2ETestCase {
  name: string;
  status: "passed" | "failed" | "skipped" | "timedOut";
  duration: number;
  error?: string;
  retries: number;
}

export interface IntegrationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  suites: IntegrationSuite[];
}

export interface IntegrationSuite {
  name: string;
  tests: {
    name: string;
    status: "passed" | "failed";
    duration: number;
    error?: string;
  }[];
}

/* ── GitHub Actions CI Types ──────────────────────────────── */

export interface CIWorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | null;
  html_url: string;
  run_number: number;
  event: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  actor: string;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  jobs: CIJob[];
  artifacts_url: string;
  duration?: number;
}

export interface CIJob {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
  steps: CIStep[];
}

export interface CIStep {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "skipped" | null;
  number: number;
}

export interface CITriggerResult {
  success: boolean;
  message: string;
  run_id?: number;
}

export interface CIStatus {
  configured: boolean;
  repo: string;
  workflow: string;
  latest_run?: CIWorkflowRun;
  recent_runs: CIWorkflowRun[];
}

// ── GitHub Token Management Types ───────────────────────

export interface GitHubTokenConfig {
  tokenName: string;
  tokenPrefix: string;
  expiresAt: string;
  registeredAt: string;
  lastValidatedAt: string | null;
  isValid: boolean;
}

export interface GitHubTokenStatus {
  configured: boolean;
  tokenName: string | null;
  tokenPrefix: string | null;
  expiresAt: string | null;
  registeredAt: string | null;
  lastValidatedAt: string | null;
  isValid: boolean;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  expiryWarning: "critical" | "warning" | "notice" | null;
  envVarPresent: boolean;
}

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);
  private testHistory: TestRunHistoryEntry[] = [];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the API base URL.
   * Priority: SMOKE_TEST_URL env > API_URL env > production default
   */
  private getApiBaseUrl(): string {
    return (
      process.env.SMOKE_TEST_URL ||
      process.env.API_URL ||
      "https://api.orivraa.com"
    );
  }

  // ── Smoke Tests ──────────────────────────────────────────

  async runSmokeTests(): Promise<SmokeTestReport> {
    const start = Date.now();
    const results: SmokeTestResult[] = [];
    const baseUrl = this.getApiBaseUrl();
    this.logger.log(`Running smoke tests against: ${baseUrl}`);

    // Category: Health
    results.push(
      await this.testEndpoint(
        "Health Check",
        "health",
        "/api/health",
        200,
        "GET",
        undefined,
        baseUrl,
      ),
    );
    results.push(
      await this.testEndpoint(
        "Health Readiness",
        "health",
        "/api/health/ready",
        200,
        "GET",
        undefined,
        baseUrl,
      ),
    );

    // Category: Metrics
    results.push(
      await this.testEndpoint(
        "Metrics Endpoint",
        "metrics",
        "/api/metrics",
        200,
        "GET",
        undefined,
        baseUrl,
      ),
    );

    // Category: Auth
    results.push(
      await this.testEndpoint(
        "Auth - Login Page",
        "auth",
        "/api/auth/login",
        [400, 401, 405],
        "POST",
        "{}",
        baseUrl,
      ),
    );
    results.push(
      await this.testEndpoint(
        "Auth - Protected Route",
        "auth",
        "/api/users/me",
        401,
        "GET",
        undefined,
        baseUrl,
      ),
    );

    // Category: Public APIs
    results.push(
      await this.testEndpoint(
        "Market Rates",
        "public",
        "/api/market-rates",
        [200, 304],
        "GET",
        undefined,
        baseUrl,
      ),
    );

    // Category: Error Handling
    results.push(
      await this.testEndpoint(
        "404 Unknown Route",
        "errors",
        "/api/nonexistent-test-route",
        404,
        "GET",
        undefined,
        baseUrl,
      ),
    );

    // Category: Response Time
    results.push(
      await this.testResponseTime(
        "Health Response Time",
        "performance",
        "/api/health",
        2000,
        baseUrl,
      ),
    );

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    // Build category summary
    const categoryMap = new Map<
      string,
      { passed: number; failed: number; total: number }
    >();
    for (const r of results) {
      const cat = categoryMap.get(r.category) || {
        passed: 0,
        failed: 0,
        total: 0,
      };
      cat.total++;
      if (r.status === "pass") cat.passed++;
      else if (r.status === "fail") cat.failed++;
      categoryMap.set(r.category, cat);
    }

    const report: SmokeTestReport = {
      timestamp: new Date().toISOString(),
      environment:
        baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
          ? "local"
          : "production",
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration: Date.now() - start,
      categories: Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        ...data,
      })),
      results,
    };

    // Save to history
    this.addToHistory("smoke", report);

    return report;
  }

  // ── GitHub Actions CI ─────────────────────────────────────

  private readonly GH_REPO = "aakash-priyadarshi/gold-shop-app";
  private readonly GH_WORKFLOW = "test.yml";
  private readonly GH_API = "https://api.github.com";

  private getGithubToken(): string | null {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  }

  private async ghFetch<T = any>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const token = this.getGithubToken();
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN env var not configured. Add a Personal Access Token with actions:read and actions:write scopes.",
      );
    }

    const url = new URL(endpoint, this.GH_API);

    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Orivraa-TestDashboard/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(payload
              ? {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(payload),
                }
              : {}),
          },
          timeout: 15000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              // 204 No Content (e.g. workflow dispatch returns 204)
              if (res.statusCode === 204 || !data) {
                resolve({} as T);
              } else {
                try {
                  resolve(JSON.parse(data));
                } catch {
                  resolve(data as unknown as T);
                }
              }
            } else {
              reject(
                new Error(
                  `GitHub API ${res.statusCode}: ${data.slice(0, 300)}`,
                ),
              );
            }
          });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("GitHub API request timed out"));
      });
      if (payload) req.write(payload);
      req.end();
    });
  }

  /**
   * Trigger the CI test workflow via GitHub Actions API.
   * POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
   */
  async triggerCIWorkflow(branch: string = "master"): Promise<CITriggerResult> {
    try {
      await this.ghFetch(
        `/repos/${this.GH_REPO}/actions/workflows/${this.GH_WORKFLOW}/dispatches`,
        "POST",
        { ref: branch },
      );

      this.logger.log(`CI workflow triggered on branch: ${branch}`);

      // GitHub doesn't return the run_id from dispatch — poll for it
      await new Promise((r) => setTimeout(r, 2000));
      const runs = await this.getCIRuns(1);
      const latest = runs[0];

      this.addToHistory("ci", {
        passed: 0,
        failed: 0,
        skipped: 0,
        totalTests: 0,
        duration: 0,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Workflow dispatched on branch "${branch}". Check CI tab for progress.`,
        run_id: latest?.id,
      };
    } catch (err: any) {
      this.logger.error("Failed to trigger CI workflow", err?.message);
      return {
        success: false,
        message: err?.message || "Failed to trigger CI workflow",
      };
    }
  }

  /**
   * Get recent workflow runs.
   * GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs
   */
  async getCIRuns(limit: number = 10): Promise<CIWorkflowRun[]> {
    const data = await this.ghFetch<{ workflow_runs: any[] }>(
      `/repos/${this.GH_REPO}/actions/workflows/${this.GH_WORKFLOW}/runs?per_page=${limit}`,
    );

    return (data.workflow_runs || []).map((r: any) => this.mapWorkflowRun(r));
  }

  /**
   * Get a specific workflow run by ID, including its jobs.
   * GET /repos/{owner}/{repo}/actions/runs/{run_id}
   */
  async getCIRunDetail(runId: number): Promise<CIWorkflowRun> {
    const [run, jobsData] = await Promise.all([
      this.ghFetch<any>(`/repos/${this.GH_REPO}/actions/runs/${runId}`),
      this.ghFetch<{ jobs: any[] }>(
        `/repos/${this.GH_REPO}/actions/runs/${runId}/jobs`,
      ),
    ]);

    const mapped = this.mapWorkflowRun(run);
    mapped.jobs = (jobsData.jobs || []).map((j: any) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      conclusion: j.conclusion,
      started_at: j.started_at,
      completed_at: j.completed_at,
      html_url: j.html_url,
      steps: (j.steps || []).map((s: any) => ({
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
        number: s.number,
      })),
    }));

    return mapped;
  }

  /**
   * Get overall CI status including configuration check and latest runs.
   */
  async getCIStatus(): Promise<CIStatus> {
    const token = this.getGithubToken();
    if (!token) {
      return {
        configured: false,
        repo: this.GH_REPO,
        workflow: this.GH_WORKFLOW,
        recent_runs: [],
      };
    }

    try {
      const runs = await this.getCIRuns(5);
      return {
        configured: true,
        repo: this.GH_REPO,
        workflow: this.GH_WORKFLOW,
        latest_run: runs[0] || undefined,
        recent_runs: runs,
      };
    } catch (err: any) {
      this.logger.error("Failed to fetch CI status", err?.message);
      return {
        configured: true,
        repo: this.GH_REPO,
        workflow: this.GH_WORKFLOW,
        recent_runs: [],
      };
    }
  }

  /**
   * Re-run a failed workflow run.
   * POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun
   */
  async rerunCIWorkflow(runId: number): Promise<CITriggerResult> {
    try {
      await this.ghFetch(
        `/repos/${this.GH_REPO}/actions/runs/${runId}/rerun`,
        "POST",
        {},
      );
      return {
        success: true,
        message: `Re-run triggered for workflow run #${runId}`,
        run_id: runId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Failed to re-run workflow",
      };
    }
  }

  /**
   * Cancel a running workflow.
   * POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel
   */
  async cancelCIWorkflow(runId: number): Promise<CITriggerResult> {
    try {
      await this.ghFetch(
        `/repos/${this.GH_REPO}/actions/runs/${runId}/cancel`,
        "POST",
        {},
      );
      return {
        success: true,
        message: `Workflow run #${runId} cancelled`,
        run_id: runId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Failed to cancel workflow",
      };
    }
  }

  private mapWorkflowRun(r: any): CIWorkflowRun {
    const startedAt = r.run_started_at
      ? new Date(r.run_started_at).getTime()
      : null;
    const updatedAt = r.updated_at ? new Date(r.updated_at).getTime() : null;
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      conclusion: r.conclusion,
      html_url: r.html_url,
      run_number: r.run_number,
      event: r.event,
      branch: r.head_branch,
      commit_sha: r.head_sha?.substring(0, 7),
      commit_message:
        r.head_commit?.message?.split("\n")[0] || "No commit message",
      actor: r.actor?.login || "unknown",
      created_at: r.created_at,
      updated_at: r.updated_at,
      run_started_at: r.run_started_at || r.created_at,
      jobs: [],
      artifacts_url: r.artifacts_url,
      duration:
        startedAt && updatedAt && r.status === "completed"
          ? updatedAt - startedAt
          : undefined,
    };
  }

  // ── E2E Tests (via CI) ──────────────────────────────────

  async runE2ETests(): Promise<E2EReport | CITriggerResult> {
    // On production (Railway), E2E tests run via GitHub Actions CI
    // since Playwright browsers aren't available on the server.
    const token = this.getGithubToken();
    if (token) {
      this.logger.log("Triggering E2E tests via GitHub Actions CI...");
      return this.triggerCIWorkflow() as any;
    }

    // Fallback: local execution (dev machine)
    return this.runE2ETestsLocal();
  }

  async runE2ETestsLocal(): Promise<E2EReport> {
    const start = Date.now();
    const rootDir = this.getProjectRoot();
    const e2eDir = path.join(rootDir, "e2e");
    const reportPath = path.join(rootDir, "e2e-results", "results.json");

    const resultDir = path.join(rootDir, "e2e-results");
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    try {
      execSync(`npx playwright test --reporter=json`, {
        cwd: e2eDir,
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath },
        timeout: 120_000,
        stdio: "pipe",
      });
    } catch {
      this.logger.warn(
        "Playwright exited with non-zero code (some tests may have failed)",
      );
    }

    const report = this.parsePlaywrightReport(reportPath, Date.now() - start);

    this.addToHistory("e2e", {
      passed: report.passed,
      failed: report.failed,
      skipped: report.skipped,
      totalTests: report.totalTests,
      duration: report.duration,
      timestamp: report.timestamp,
    });

    return report;
  }

  getLatestE2EReport(): E2EReport | null {
    const rootDir = this.getProjectRoot();
    const reportPath = path.join(rootDir, "e2e-results", "results.json");
    if (!fs.existsSync(reportPath)) return null;
    return this.parsePlaywrightReport(reportPath, 0);
  }

  // ── Integration Tests (via CI) ──────────────────────────

  async runIntegrationTests(): Promise<IntegrationReport | CITriggerResult> {
    // On production (Railway), integration tests run via GitHub Actions CI
    const token = this.getGithubToken();
    if (token) {
      this.logger.log("Triggering integration tests via GitHub Actions CI...");
      return this.triggerCIWorkflow() as any;
    }

    // Fallback: local execution
    return this.runIntegrationTestsLocal();
  }

  async runIntegrationTestsLocal(): Promise<IntegrationReport> {
    const start = Date.now();
    const rootDir = this.getProjectRoot();
    const apiDir = path.join(rootDir, "apps", "api");
    const resultPath = path.join(rootDir, "e2e-results", "jest-results.json");

    const resultDir = path.join(rootDir, "e2e-results");
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    try {
      execSync(
        `npx jest --config test/jest-e2e.json --json --outputFile="${resultPath}" --forceExit`,
        { cwd: apiDir, timeout: 60_000, stdio: "pipe" },
      );
    } catch {
      this.logger.warn(
        "Jest exited with non-zero code (some tests may have failed)",
      );
    }

    const report = this.parseJestReport(resultPath, Date.now() - start);

    this.addToHistory("integration", {
      passed: report.passed,
      failed: report.failed,
      skipped: 0,
      totalTests: report.totalTests,
      duration: report.duration,
      timestamp: report.timestamp,
    });

    return report;
  }

  getLatestIntegrationReport(): IntegrationReport | null {
    const rootDir = this.getProjectRoot();
    const resultPath = path.join(rootDir, "e2e-results", "jest-results.json");
    if (!fs.existsSync(resultPath)) return null;
    return this.parseJestReport(resultPath, 0);
  }

  // ── Git Info ─────────────────────────────────────────────

  getGitInfo(): Record<string, string> {
    // First try local git (works in dev / CI runners)
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD")
        .toString()
        .trim();
      const commit = execSync("git rev-parse --short HEAD").toString().trim();
      const commitFull = execSync("git rev-parse HEAD").toString().trim();
      const message = execSync("git log -1 --pretty=%B").toString().trim();
      const author = execSync("git log -1 --pretty=%an").toString().trim();
      const date = execSync("git log -1 --pretty=%ci").toString().trim();
      return { branch, commit, commitFull, message, author, date };
    } catch {
      // No .git directory (Railway / Docker) — try fetching from GitHub API
      return this.getGitInfoFallback();
    }
  }

  private getGitInfoFallback(): Record<string, string> {
    const token = this.getGithubToken();
    if (!token) {
      return {
        branch: "master",
        commit: "N/A",
        commitFull: "",
        message: "Git info unavailable — no .git dir and no GITHUB_TOKEN",
        author: "",
        date: "",
      };
    }

    // Synchronous HTTPS fetch via child_process so the return type stays sync
    try {
      const curlCmd = `curl -sS -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "User-Agent: Orivraa-TestDashboard/1.0" "https://api.github.com/repos/${this.GH_REPO}/commits/master?per_page=1"`;
      const raw = execSync(curlCmd, { timeout: 8000 }).toString().trim();
      const data = JSON.parse(raw);
      return {
        branch: "master",
        commit: (data.sha || "").substring(0, 7),
        commitFull: data.sha || "",
        message: data.commit?.message || "",
        author: data.commit?.author?.name || data.commit?.committer?.name || "",
        date: data.commit?.author?.date || data.commit?.committer?.date || "",
      };
    } catch (e) {
      this.logger.warn("GitHub API fallback for git info failed", e);
      return {
        branch: "master",
        commit: "N/A",
        commitFull: "",
        message: "Unable to fetch git info from GitHub API",
        author: "",
        date: "",
      };
    }
  }

  // ── Runtime Info ─────────────────────────────────────────

  getRuntimeInfo(): Record<string, unknown> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
      cwd: process.cwd(),
      cpuUsage: process.cpuUsage(),
    };
  }

  // ── Test History ─────────────────────────────────────────

  getTestHistory(): TestRunHistoryEntry[] {
    return [...this.testHistory].reverse(); // Most recent first
  }

  clearTestHistory(): void {
    this.testHistory = [];
  }

  // ── Private helpers ──────────────────────────────────────

  private getProjectRoot(): string {
    // Walk up from cwd to find package.json with "gold-shop-app"
    let dir = process.cwd();
    for (let i = 0; i < 5; i++) {
      const pkg = path.join(dir, "package.json");
      if (fs.existsSync(pkg)) {
        try {
          const content = JSON.parse(fs.readFileSync(pkg, "utf-8"));
          if (content.name === "gold-shop-app") return dir;
        } catch {
          /* skip */
        }
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  private addToHistory(
    type: TestRunHistoryEntry["type"],
    data: {
      passed: number;
      failed: number;
      skipped?: number;
      totalTests: number;
      duration: number;
      timestamp: string;
    },
  ): void {
    const git = this.getGitInfo();
    this.testHistory.push({
      id: `${type}-${Date.now()}`,
      type,
      timestamp: data.timestamp,
      duration: data.duration,
      passed: data.passed,
      failed: data.failed,
      skipped: data.skipped || 0,
      total: data.totalTests,
      trigger: "manual",
      branch: git.branch,
      commit: git.commit,
    });

    // Keep last 50 entries
    if (this.testHistory.length > 50) {
      this.testHistory = this.testHistory.slice(-50);
    }
  }

  private testEndpoint(
    name: string,
    category: string,
    urlPath: string,
    expectedStatus: number | number[],
    method: "GET" | "POST" = "GET",
    body?: string,
    baseUrl?: string,
  ): Promise<SmokeTestResult> {
    const expected = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];
    const base = baseUrl || this.getApiBaseUrl();
    return new Promise((resolve) => {
      const start = Date.now();
      const fullUrl = new URL(urlPath, base);
      const isHttps = fullUrl.protocol === "https:";
      const transport = isHttps ? https : http;
      const options: http.RequestOptions = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || (isHttps ? 443 : 80),
        path: fullUrl.pathname + fullUrl.search,
        method,
        timeout: 10000,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          "User-Agent": "Orivraa-SmokeTest/1.0",
        },
      };
      const req = transport.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const ok = expected.includes(res.statusCode!);
          resolve({
            name,
            category,
            status: ok ? "pass" : "fail",
            duration: Date.now() - start,
            message: `HTTP ${res.statusCode}`,
            expected: expected.join("|"),
            actual: String(res.statusCode),
          });
        });
      });
      req.on("error", (err) => {
        resolve({
          name,
          category,
          status: "fail",
          duration: Date.now() - start,
          message: err.message,
          expected: expected.join("|"),
          actual: "connection error",
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({
          name,
          category,
          status: "fail",
          duration: Date.now() - start,
          message: "Request timed out (>10s)",
          expected: expected.join("|"),
          actual: "timeout",
        });
      });
      if (body) req.write(body);
      req.end();
    });
  }

  private testResponseTime(
    name: string,
    category: string,
    urlPath: string,
    maxMs: number,
    baseUrl?: string,
  ): Promise<SmokeTestResult> {
    const base = baseUrl || this.getApiBaseUrl();
    return new Promise((resolve) => {
      const start = Date.now();
      const fullUrl = new URL(urlPath, base);
      const isHttps = fullUrl.protocol === "https:";
      const transport = isHttps ? https : http;
      const req = transport.request(
        {
          hostname: fullUrl.hostname,
          port: fullUrl.port || (isHttps ? 443 : 80),
          path: fullUrl.pathname,
          method: "GET",
          timeout: maxMs + 2000,
          headers: { "User-Agent": "Orivraa-SmokeTest/1.0" },
        },
        (res) => {
          res.resume();
          res.on("end", () => {
            const dur = Date.now() - start;
            resolve({
              name,
              category,
              status: dur <= maxMs ? "pass" : "fail",
              duration: dur,
              message: `${dur}ms (max ${maxMs}ms)`,
              expected: `<= ${maxMs}ms`,
              actual: `${dur}ms`,
            });
          });
        },
      );
      req.on("error", (err) => {
        resolve({
          name,
          category,
          status: "fail",
          duration: Date.now() - start,
          message: err.message,
          expected: `<= ${maxMs}ms`,
          actual: "error",
        });
      });
      req.end();
    });
  }

  private parsePlaywrightReport(
    filePath: string,
    fallbackDuration: number,
  ): E2EReport {
    const empty: E2EReport = {
      timestamp: new Date().toISOString(),
      browser: "chromium",
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: fallbackDuration,
      suites: [],
    };

    if (!fs.existsSync(filePath)) return empty;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const suites: E2ESuite[] = [];
      let passed = 0,
        failed = 0,
        skipped = 0;

      for (const suite of raw.suites || []) {
        const tests: E2ETestCase[] = [];
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            const result = test.results?.[0];
            const status = result?.status || "skipped";
            if (status === "passed" || status === "expected") passed++;
            else if (status === "failed" || status === "unexpected") failed++;
            else skipped++;

            tests.push({
              name: spec.title,
              status:
                status === "expected"
                  ? "passed"
                  : status === "unexpected"
                    ? "failed"
                    : status,
              duration: result?.duration || 0,
              error: result?.error?.message,
              retries: (test.results?.length || 1) - 1,
            });
          }
        }
        suites.push({
          name: suite.title,
          file: suite.file || "",
          tests,
          duration: tests.reduce((s, t) => s + t.duration, 0),
        });
      }

      return {
        timestamp: new Date().toISOString(),
        browser: raw.config?.projects?.[0]?.name || "chromium",
        totalTests: passed + failed + skipped,
        passed,
        failed,
        skipped,
        duration: raw.stats?.duration || fallbackDuration,
        suites,
        htmlReportPath: "playwright-report/index.html",
      };
    } catch (err) {
      this.logger.error("Failed to parse Playwright report", err);
      return empty;
    }
  }

  private parseJestReport(
    filePath: string,
    fallbackDuration: number,
  ): IntegrationReport {
    const empty: IntegrationReport = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      duration: fallbackDuration,
      suites: [],
    };

    if (!fs.existsSync(filePath)) return empty;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const suites: IntegrationSuite[] = [];
      let passed = 0,
        failed = 0;

      for (const testResult of raw.testResults || []) {
        const tests = (testResult.assertionResults || []).map((ar: any) => {
          const ok = ar.status === "passed";
          if (ok) passed++;
          else failed++;
          return {
            name: ar.ancestorTitles?.join(" > ") + " > " + ar.title,
            status: ok ? ("passed" as const) : ("failed" as const),
            duration: ar.duration || 0,
            error: ar.failureMessages?.join("\n"),
          };
        });
        suites.push({
          name: testResult.testFilePath || testResult.name,
          tests,
        });
      }

      return {
        timestamp: new Date().toISOString(),
        totalTests: passed + failed,
        passed,
        failed,
        duration: raw.testResults?.[0]?.endTime
          ? raw.testResults[0].endTime - raw.testResults[0].startTime
          : fallbackDuration,
        suites,
      };
    } catch (err) {
      this.logger.error("Failed to parse Jest report", err);
      return empty;
    }
  }

  // ── GitHub Token Management ─────────────────────────────

  private readonly GH_TOKEN_CONFIG_KEY = "github_token_config";

  /**
   * Register GitHub token metadata for expiry tracking.
   * The actual token value lives in GITHUB_TOKEN env var — we only store metadata.
   */
  async registerGitHubToken(input: {
    tokenName: string;
    tokenPrefix: string;
    expiresAt: string;
  }): Promise<GitHubTokenStatus> {
    const config: GitHubTokenConfig = {
      tokenName: input.tokenName,
      tokenPrefix: input.tokenPrefix,
      expiresAt: input.expiresAt,
      registeredAt: new Date().toISOString(),
      lastValidatedAt: null,
      isValid: true,
    };

    await this.prisma.systemConfig.upsert({
      where: { key: this.GH_TOKEN_CONFIG_KEY },
      update: { value: config as any, updatedAt: new Date() },
      create: { key: this.GH_TOKEN_CONFIG_KEY, value: config as any },
    });

    return this.getGitHubTokenStatus();
  }

  /**
   * Get the current GitHub token status with expiry info and warnings.
   */
  async getGitHubTokenStatus(): Promise<GitHubTokenStatus> {
    const envVarPresent = !!this.getGithubToken();

    const record = await this.prisma.systemConfig.findUnique({
      where: { key: this.GH_TOKEN_CONFIG_KEY },
    });

    if (!record) {
      return {
        configured: envVarPresent,
        tokenName: null,
        tokenPrefix: null,
        expiresAt: null,
        registeredAt: null,
        lastValidatedAt: null,
        isValid: envVarPresent,
        isExpired: false,
        daysUntilExpiry: null,
        expiryWarning: null,
        envVarPresent,
      };
    }

    const config = record.value as unknown as GitHubTokenConfig;
    const now = new Date();
    const expiresAt = new Date(config.expiresAt);
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isExpired = daysUntilExpiry <= 0;

    let expiryWarning: "critical" | "warning" | "notice" | null = null;
    if (isExpired) expiryWarning = "critical";
    else if (daysUntilExpiry <= 7) expiryWarning = "critical";
    else if (daysUntilExpiry <= 14) expiryWarning = "warning";
    else if (daysUntilExpiry <= 30) expiryWarning = "notice";

    return {
      configured: envVarPresent,
      tokenName: config.tokenName,
      tokenPrefix: config.tokenPrefix,
      expiresAt: config.expiresAt,
      registeredAt: config.registeredAt,
      lastValidatedAt: config.lastValidatedAt,
      isValid: config.isValid && !isExpired,
      isExpired,
      daysUntilExpiry,
      expiryWarning,
      envVarPresent,
    };
  }

  /**
   * Validate the GitHub token by calling the GitHub API.
   * Updates the stored config with validation result.
   */
  async validateGitHubToken(): Promise<{
    valid: boolean;
    scopes: string[];
    rateLimit: { remaining: number; limit: number; reset: string };
    user: string;
    message?: string;
  }> {
    const token = this.getGithubToken();
    if (!token) {
      return {
        valid: false,
        scopes: [],
        rateLimit: { remaining: 0, limit: 0, reset: "" },
        user: "",
        message: "GITHUB_TOKEN environment variable is not set",
      };
    }

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.github.com",
          path: "/user",
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "Orivraa-TestDashboard/1.0",
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", async () => {
            const valid = res.statusCode === 200;
            const scopes = (res.headers["x-oauth-scopes"] || "")
              .toString()
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const rateLimit = {
              remaining: Number(res.headers["x-ratelimit-remaining"] || 0),
              limit: Number(res.headers["x-ratelimit-limit"] || 0),
              reset: res.headers["x-ratelimit-reset"]
                ? new Date(
                    Number(res.headers["x-ratelimit-reset"]) * 1000,
                  ).toISOString()
                : "",
            };

            let user = "";
            try {
              const data = JSON.parse(body);
              user = data.login || "";
            } catch {}

            // Update stored config with validation result
            try {
              const record = await this.prisma.systemConfig.findUnique({
                where: { key: this.GH_TOKEN_CONFIG_KEY },
              });
              if (record) {
                const config = record.value as unknown as GitHubTokenConfig;
                config.lastValidatedAt = new Date().toISOString();
                config.isValid = valid;
                await this.prisma.systemConfig.update({
                  where: { key: this.GH_TOKEN_CONFIG_KEY },
                  data: { value: config as any },
                });
              }
            } catch (e) {
              this.logger.warn("Failed to update token validation status", e);
            }

            resolve({
              valid,
              scopes,
              rateLimit,
              user,
              message: valid
                ? undefined
                : `GitHub API returned ${res.statusCode}`,
            });
          });
        },
      );

      req.on("error", (err) => {
        resolve({
          valid: false,
          scopes: [],
          rateLimit: { remaining: 0, limit: 0, reset: "" },
          user: "",
          message: err.message,
        });
      });
      req.end();
    });
  }

  /**
   * Delete the stored GitHub token config (does NOT remove the env var).
   */
  async deleteGitHubTokenConfig(): Promise<{ success: boolean }> {
    try {
      await this.prisma.systemConfig.delete({
        where: { key: this.GH_TOKEN_CONFIG_KEY },
      });
      return { success: true };
    } catch {
      return { success: true }; // Already deleted or doesn't exist
    }
  }
}
