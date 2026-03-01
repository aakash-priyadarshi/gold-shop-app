import { Injectable, Logger } from "@nestjs/common";
import { execSync } from "child_process";
import * as http from "http";

export interface SmokeTestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  message?: string;
}

export interface SmokeTestReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: SmokeTestResult[];
}

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);

  /**
   * Run a quick smoke-test suite against local endpoints.
   */
  async runSmokeTests(): Promise<SmokeTestReport> {
    const start = Date.now();
    const results: SmokeTestResult[] = [];

    // Health check
    results.push(await this.testEndpoint("Health Check", "/api/health"));
    results.push(await this.testEndpoint("Health Detailed", "/api/health/detailed"));
    results.push(await this.testEndpoint("Metrics", "/api/metrics"));

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      totalTests: results.length,
      passed,
      failed,
      skipped,
      duration: Date.now() - start,
      results,
    };
  }

  /**
   * Return the current git commit info.
   */
  getGitInfo(): Record<string, string> {
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
      const commit = execSync("git rev-parse --short HEAD").toString().trim();
      const message = execSync("git log -1 --pretty=%B").toString().trim();
      return { branch, commit, message };
    } catch {
      return { branch: "unknown", commit: "unknown", message: "unable to read git info" };
    }
  }

  /**
   * Return basic runtime info.
   */
  getRuntimeInfo(): Record<string, unknown> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
    };
  }

  // ── Private helpers ──────────────────────────────────────

  private testEndpoint(
    name: string,
    path: string,
    port = 4000,
  ): Promise<SmokeTestResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const req = http.request(
        { hostname: "localhost", port, path, method: "GET", timeout: 5000 },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve({
              name,
              status: res.statusCode && res.statusCode < 400 ? "pass" : "fail",
              duration: Date.now() - start,
              message: `HTTP ${res.statusCode}`,
            });
          });
        },
      );
      req.on("error", (err) => {
        resolve({
          name,
          status: "fail",
          duration: Date.now() - start,
          message: err.message,
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({
          name,
          status: "fail",
          duration: Date.now() - start,
          message: "Timeout",
        });
      });
      req.end();
    });
  }
}
