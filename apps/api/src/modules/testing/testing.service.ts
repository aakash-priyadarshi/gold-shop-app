import { Injectable, Logger } from "@nestjs/common";
import { execSync } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

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
  type: "smoke" | "e2e" | "integration" | "full";
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
  tests: { name: string; status: "passed" | "failed"; duration: number; error?: string }[];
}

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);
  private testHistory: TestRunHistoryEntry[] = [];

  // ── Smoke Tests ──────────────────────────────────────────

  async runSmokeTests(): Promise<SmokeTestReport> {
    const start = Date.now();
    const results: SmokeTestResult[] = [];

    // Category: Health
    results.push(await this.testEndpoint("Health Check", "health", "/api/health", 200));
    results.push(await this.testEndpoint("Health Detailed", "health", "/api/health/detailed", 200));

    // Category: Metrics
    results.push(await this.testEndpoint("Metrics Endpoint", "metrics", "/api/metrics", 200));

    // Category: Auth
    results.push(await this.testEndpoint("Auth - Login Page", "auth", "/api/auth/login", [400, 401, 405], "POST", "{}"));
    results.push(await this.testEndpoint("Auth - Protected Route", "auth", "/api/users/me", 401));

    // Category: Public APIs
    results.push(await this.testEndpoint("Market Rates", "public", "/api/market-rates", [200, 304]));

    // Category: Error Handling
    results.push(await this.testEndpoint("404 Unknown Route", "errors", "/api/nonexistent-test-route", 404));

    // Category: Response Time
    results.push(await this.testResponseTime("Health Response Time", "performance", "/api/health", 1000));

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    // Build category summary
    const categoryMap = new Map<string, { passed: number; failed: number; total: number }>();
    for (const r of results) {
      const cat = categoryMap.get(r.category) || { passed: 0, failed: 0, total: 0 };
      cat.total++;
      if (r.status === "pass") cat.passed++;
      else if (r.status === "fail") cat.failed++;
      categoryMap.set(r.category, cat);
    }

    const report: SmokeTestReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration: Date.now() - start,
      categories: Array.from(categoryMap.entries()).map(([name, data]) => ({ name, ...data })),
      results,
    };

    // Save to history
    this.addToHistory("smoke", report);

    return report;
  }

  // ── E2E Tests (Playwright) ───────────────────────────────

  async runE2ETests(): Promise<E2EReport> {
    const start = Date.now();
    const rootDir = this.getProjectRoot();
    const e2eDir = path.join(rootDir, "e2e");
    const reportPath = path.join(rootDir, "e2e-results", "results.json");

    // Ensure result dir exists
    const resultDir = path.join(rootDir, "e2e-results");
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    try {
      // Run Playwright with JSON reporter
      execSync(
        `npx playwright test --reporter=json`,
        {
          cwd: e2eDir,
          env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath },
          timeout: 120_000,
          stdio: "pipe",
        },
      );
    } catch {
      // Playwright exits with code 1 on test failures, which is expected
      this.logger.warn("Playwright exited with non-zero code (some tests may have failed)");
    }

    // Parse JSON report
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

  // ── Integration Tests (Jest) ─────────────────────────────

  async runIntegrationTests(): Promise<IntegrationReport> {
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
      this.logger.warn("Jest exited with non-zero code (some tests may have failed)");
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
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
      const commit = execSync("git rev-parse --short HEAD").toString().trim();
      const commitFull = execSync("git rev-parse HEAD").toString().trim();
      const message = execSync("git log -1 --pretty=%B").toString().trim();
      const author = execSync("git log -1 --pretty=%an").toString().trim();
      const date = execSync("git log -1 --pretty=%ci").toString().trim();
      return { branch, commit, commitFull, message, author, date };
    } catch {
      return { branch: "unknown", commit: "unknown", commitFull: "", message: "unable to read git info", author: "", date: "" };
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
        } catch { /* skip */ }
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  private addToHistory(
    type: TestRunHistoryEntry["type"],
    data: { passed: number; failed: number; skipped?: number; totalTests: number; duration: number; timestamp: string },
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
  ): Promise<SmokeTestResult> {
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    return new Promise((resolve) => {
      const start = Date.now();
      const options: http.RequestOptions = {
        hostname: "127.0.0.1",
        port: 4000,
        path: urlPath,
        method,
        timeout: 5000,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      };
      const req = http.request(options, (res) => {
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
          message: "Request timed out (>5s)",
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
  ): Promise<SmokeTestResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const req = http.request(
        { hostname: "127.0.0.1", port: 4000, path: urlPath, method: "GET", timeout: maxMs + 1000 },
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

  private parsePlaywrightReport(filePath: string, fallbackDuration: number): E2EReport {
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
      let passed = 0, failed = 0, skipped = 0;

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
              status: status === "expected" ? "passed" : status === "unexpected" ? "failed" : status,
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

  private parseJestReport(filePath: string, fallbackDuration: number): IntegrationReport {
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
      let passed = 0, failed = 0;

      for (const testResult of raw.testResults || []) {
        const tests = (testResult.assertionResults || []).map((ar: any) => {
          const ok = ar.status === "passed";
          if (ok) passed++; else failed++;
          return {
            name: ar.ancestorTitles?.join(" > ") + " > " + ar.title,
            status: ok ? "passed" as const : "failed" as const,
            duration: ar.duration || 0,
            error: ar.failureMessages?.join("\n"),
          };
        });
        suites.push({ name: testResult.testFilePath || testResult.name, tests });
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
}
