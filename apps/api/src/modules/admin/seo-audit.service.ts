import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../prisma/prisma.service";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import { NotificationsService } from "../notifications/notifications.service";
import { countH1Tags, decodeHtmlEntities } from "./seo-audit-html";
import { buildSeoAuditPathList } from "./seo-audit-routes";

export interface CrawlResult {
  status: number;
  redirectTarget: string | null;
}

export interface SeoAuditPageReport {
  path: string;
  score: number;
  status: "SUCCESS" | "WARNING" | "ERROR";
  title: string | null;
  description: string | null;
  h1Count: number;
  wordCount: number;
  canonical: string | null;
  robots: string | null;
  hasOpenGraph: boolean;
  hasOgImage: boolean;
  hasJsonLd: boolean;
  recommendations: string[];
  crawlResults: {
    googlebotMobile: CrawlResult;
    googlebotDesktop: CrawlResult;
    browserDesktop: CrawlResult;
    browserMobile: CrawlResult;
  };
}

export interface SeoAuditReport {
  id: string;
  timestamp: string;
  overallScore: number;
  totalPages: number;
  indexablePages: number;
  redirectPages: number;
  errorPages: number;
  warningPages: number;
  criticalRedirects: number;
  pages: SeoAuditPageReport[];
}

export interface SeoAuditSettings {
  isAutoCheckEnabled: boolean;
  schedule: "daily" | "weekly" | "disabled";
  targetUrl: string | null; // Null means autodetect (use FRONTEND_URL or production)
}

const DEFAULT_FRONTEND_URL = "https://www.orivraa.com";

@Injectable()
export class SeoAuditService implements OnModuleInit {
  private readonly logger = new Logger(SeoAuditService.name);
  private readonly dataDir = path.join(process.cwd(), "data");
  private readonly reportsFile = path.join(this.dataDir, "seo-reports.json");
  private readonly settingsFile = path.join(this.dataDir, "seo-settings.json");
  private isCrawlInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  onModuleInit() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Initialize files if they don't exist
    if (!fs.existsSync(this.reportsFile)) {
      fs.writeFileSync(this.reportsFile, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(this.settingsFile)) {
      const defaultSettings: SeoAuditSettings = {
        isAutoCheckEnabled: true,
        schedule: "weekly",
        targetUrl: null,
      };
      fs.writeFileSync(this.settingsFile, JSON.stringify(defaultSettings, null, 2));
    }
  }

  getSettings(): SeoAuditSettings {
    try {
      if (fs.existsSync(this.settingsFile)) {
        return JSON.parse(fs.readFileSync(this.settingsFile, "utf8"));
      }
    } catch (e) {
      this.logger.error("Failed to read SEO settings:", e);
    }
    return {
      isAutoCheckEnabled: true,
      schedule: "weekly",
      targetUrl: null,
    };
  }

  saveSettings(settings: SeoAuditSettings): void {
    fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
  }

  getAuditHistory(): Omit<SeoAuditReport, "pages">[] {
    try {
      if (fs.existsSync(this.reportsFile)) {
        const reports: SeoAuditReport[] = JSON.parse(fs.readFileSync(this.reportsFile, "utf8"));
        return reports.map(({ pages: _pages, ...summary }) => summary);
      }
    } catch (e) {
      this.logger.error("Failed to read audit history:", e);
    }
    return [];
  }

  getLatestReport(): SeoAuditReport | null {
    try {
      if (fs.existsSync(this.reportsFile)) {
        const reports: SeoAuditReport[] = JSON.parse(fs.readFileSync(this.reportsFile, "utf8"));
        if (reports.length > 0) {
          // Sort by timestamp desc
          reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return reports[0];
        }
      }
    } catch (e) {
      this.logger.error("Failed to read latest report:", e);
    }
    return null;
  }

  // Cron schedule checks - runs daily to inspect settings and determine whether to run audit
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleScheduledCron() {
    const settings = this.getSettings();
    if (!settings.isAutoCheckEnabled || settings.schedule === "disabled") {
      return;
    }

    const today = new Date();
    // Daily checks always run. Weekly checks run on Sundays (day 0).
    if (settings.schedule === "weekly" && today.getDay() !== 0) {
      return;
    }

    this.logger.log(`Running scheduled SEO Auditor crawl (${settings.schedule})...`);
    await this.runAudit();
  }

  // Main audit trigger
  async runAudit(): Promise<SeoAuditReport> {
    if (this.isCrawlInFlight) {
      throw new Error("An SEO audit crawl is already in progress.");
    }
    this.isCrawlInFlight = true;

    try {
      const settings = this.getSettings();
      const frontendUrl =
        settings.targetUrl ||
        this.configService.get<string>("FRONTEND_URL") ||
        DEFAULT_FRONTEND_URL;

      this.logger.log(`SEO Auditor bot starting scan against base: ${frontendUrl}`);

      // 1. Gather paths
      const pathsToScan = await this.resolvePathsToScan();

      // 2. Perform crawl
      const pageReports: SeoAuditPageReport[] = [];

      // Scan concurrently in chunks to prevent server overloading while staying fast
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < pathsToScan.length; i += CONCURRENCY_LIMIT) {
        const chunk = pathsToScan.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(async (pathname) => {
          try {
            return await this.auditPage(frontendUrl, pathname);
          } catch (err) {
            this.logger.error(`Failed to audit path: ${pathname}`, err);
            return this.generateFailedPageReport(pathname, String(err));
          }
        });
        const results = await Promise.all(chunkPromises);
        pageReports.push(...results);
      }

      // 3. Compile summary statistics
      const overallScore = Math.round(
        pageReports.reduce((acc, p) => acc + p.score, 0) / Math.max(1, pageReports.length),
      );

      const totalPages = pageReports.length;
      const indexablePages = pageReports.filter((p) => p.status === "SUCCESS").length;
      const warningPages = pageReports.filter((p) => p.status === "WARNING").length;
      const errorPages = pageReports.filter((p) => p.status === "ERROR").length;

      // Count redirects (if any user-agent encountered a redirect)
      const redirectPages = pageReports.filter(
        (p) =>
          p.crawlResults.googlebotMobile.redirectTarget !== null ||
          p.crawlResults.browserDesktop.redirectTarget !== null,
      ).length;

      // Critical redirects (public pages redirecting search engine bots to /auth/login)
      const criticalRedirects = pageReports.filter((p) =>
        p.recommendations.some((r) => r.includes("Critical Redirect to Login")),
      ).length;

      const newReport: SeoAuditReport = {
        id: `seo_audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        overallScore,
        totalPages,
        indexablePages,
        redirectPages,
        errorPages,
        warningPages,
        criticalRedirects,
        pages: pageReports,
      };

      // 4. Save report in JSON file
      let allReports: SeoAuditReport[] = [];
      try {
        if (fs.existsSync(this.reportsFile)) {
          allReports = JSON.parse(fs.readFileSync(this.reportsFile, "utf8"));
        }
      } catch (err) {
        this.logger.error("Failed to read reports list for append:", err);
      }

      allReports.push(newReport);
      // Keep up to 20 audits in history to save space
      if (allReports.length > 20) {
        allReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        allReports = allReports.slice(0, 20);
      }

      fs.writeFileSync(this.reportsFile, JSON.stringify(allReports, null, 2));

      // 5. Fire admin notifications if critical redirect issues are detected!
      if (criticalRedirects > 0) {
        await this.triggerCriticalRedirectAlert(criticalRedirects, newReport.id);
      } else if (errorPages > 0) {
        await this.triggerErrorAlert(errorPages, newReport.id);
      }

      this.logger.log(`SEO Auditor bot completed scan. Overall score: ${overallScore}%`);
      return newReport;
    } finally {
      this.isCrawlInFlight = false;
    }
  }

  private async triggerCriticalRedirectAlert(count: number, _reportId: string) {
    try {
      await this.prisma.systemNotification.create({
        data: {
          title: "🚨 Critical SEO Redirect Alert",
          message: `Orivraa SEO Bot detected that ${count} public page(s) are redirecting Googlebot or guest crawlers to the login page (/auth/login). This will prevent Google search engines from indexing those pages.`,
          type: "SYSTEM_ALERT",
          targetRoles: ["ADMIN"],
          createdBy: "SEO_CRAWLER_BOT",
        },
      });
      this.logger.warn(`Triggered system warning notification for ${count} critical redirect issues.`);
    } catch (e) {
      this.logger.error("Failed to create system notification for SEO redirects", e);
    }
  }

  private async triggerErrorAlert(count: number, _reportId: string) {
    try {
      await this.prisma.systemNotification.create({
        data: {
          title: "⚠️ SEO Crawl Errors Detected",
          message: `Orivraa SEO Bot scanned public pages and found ${count} broken page(s) returning 4xx/5xx HTTP errors. Review the Auditor details for action keys.`,
          type: "SYSTEM_ALERT",
          targetRoles: ["ADMIN"],
          createdBy: "SEO_CRAWLER_BOT",
        },
      });
    } catch (e) {
      this.logger.error("Failed to create system notification for SEO errors", e);
    }
  }

  private findFrontendFilePath(relativePathFromWeb: string): string | null {
    const cwd = process.cwd();
    const candidates = [
      // If process.cwd() is apps/api
      path.join(cwd, "..", relativePathFromWeb),
      // If process.cwd() is workspace root (gold-shop-app)
      path.join(cwd, "apps", relativePathFromWeb),
      // Relative to __dirname in development
      path.join(__dirname, "../../../../", relativePathFromWeb),
      // Relative to __dirname in dist
      path.join(__dirname, "../../../../../apps", relativePathFromWeb),
    ];

    for (const candidate of candidates) {
      const normalized = path.normalize(candidate);
      if (fs.existsSync(normalized)) {
        return normalized;
      }
    }
    return null;
  }

  private async resolvePathsToScan(): Promise<string[]> {
    let generatedRoutes: string[] = [];
    let usedFallback = false;

    try {
      const generatedRoutesPath = this.findFrontendFilePath("web/src/data/generated-routes.json");
      if (generatedRoutesPath) {
        generatedRoutes = JSON.parse(fs.readFileSync(generatedRoutesPath, "utf8"));
      } else {
        this.logger.warn("Could not find generated-routes.json path, using fallback.");
        usedFallback = true;
      }
    } catch (err) {
      this.logger.warn("Could not read frontend generated routes list, using fallback.", err);
      usedFallback = true;
    }

    const customerFlowEnabled = await this.platformConfigService.isCustomerFlowEnabled();
    const paths = buildSeoAuditPathList(generatedRoutes, {
      customerFlowEnabled,
      useFallback: usedFallback || generatedRoutes.length === 0,
    });
    const pathsSet = new Set(paths);

    // Dynamic shop pages (sample verified shops)
    if (customerFlowEnabled) {
      try {
        const shops = await this.prisma.shop.findMany({
          where: { isVerified: true, isActive: true },
          select: { id: true },
          take: 5,
        });
        shops.forEach((s) => pathsSet.add(`/shops/${s.id}`));
      } catch (e) {
        this.logger.warn("Could not fetch shops database for SEO audit", e);
      }
    }

    // Dynamic blog posts
    try {
      const blogPostsPath = this.findFrontendFilePath("web/src/data/blog-posts.ts");
      if (blogPostsPath) {
        const fileContent = fs.readFileSync(blogPostsPath, "utf8");
        const slugRegex = /slug:\s*["']([^"']+)["']/g;
        let match;
        let count = 0;
        while ((match = slugRegex.exec(fileContent)) !== null && count < 25) {
          pathsSet.add(`/blog/${match[1]}`);
          count++;
        }
      } else {
        this.logger.warn("Could not find blog-posts.ts path for SEO audit.");
      }
    } catch (err) {
      this.logger.warn("Could not read static blog posts for SEO audit", err);
    }

    this.logger.log(
      `SEO Auditor resolved ${pathsSet.size} paths (customerFlow=${customerFlowEnabled}, fallback=${usedFallback || generatedRoutes.length === 0})`,
    );

    return Array.from(pathsSet).sort();
  }

  // Core audit engine for a single route path
  private async auditPage(baseUrl: string, pathname: string): Promise<SeoAuditPageReport> {
    const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const pageUrl = `${baseUrl}${cleanPath}`;

    // Crawl UAs
    const googlebotMobileUA =
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const googlebotDesktopUA =
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const browserDesktopUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const browserMobileUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

    // Trace fetches (fetch with manual redirects to see redirects directly)
    const [gMobileRes, gDesktopRes, bDesktopRes, bMobileRes] = await Promise.all([
      this.simulatedFetch(pageUrl, googlebotMobileUA),
      this.simulatedFetch(pageUrl, googlebotDesktopUA),
      this.simulatedFetch(pageUrl, browserDesktopUA),
      this.simulatedFetch(pageUrl, browserMobileUA),
    ]);

    // Initialize page report metrics
    let score = 100;
    const recommendations: string[] = [];
    let title: string | null = null;
    let description: string | null = null;
    let h1Count = 0;
    let wordCount = 0;
    let canonical: string | null = null;
    let robots: string | null = null;
    let hasOpenGraph = false;
    let hasOgImage = false;
    let hasJsonLd = false;

    // Check for critical auth leak redirect (Googlebot redirected to login)
    const gbotMobileRedirect = gMobileRes.redirectTarget;
    const gbotDesktopRedirect = gDesktopRes.redirectTarget;

    const isGooglebotRedirectedToLogin =
      (gbotMobileRedirect && gbotMobileRedirect.includes("/auth/login")) ||
      (gbotDesktopRedirect && gbotDesktopRedirect.includes("/auth/login"));

    if (isGooglebotRedirectedToLogin) {
      score -= 50;
      recommendations.push(
        "❌ **Critical Redirect to Login**: Googlebot or guest crawlers are being redirected to `/auth/login`. Public pages must not require authentication. Check route guards and token interceptors.",
      );
    }

    // Check if the page returned 4xx or 5xx
    const isError = gMobileRes.status >= 400 || bDesktopRes.status >= 400;
    if (isError) {
      score -= 40;
      recommendations.push(
        `❌ **Broken Page (HTTP ${gMobileRes.status})**: Page returned an error code. Verify that the routing exists and server-side render doesn't crash.`,
      );
    }

    // Parse HTML content if HTTP 200 was successfully returned
    if (bDesktopRes.status === 200 && bDesktopRes.html) {
      const html = bDesktopRes.html;

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : null;

      // Extract description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      description = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : null;

      // Ignore the shared <noscript> fallback heading in root layout
      h1Count = countH1Tags(html);

      // Extract canonical
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      canonical = canonicalMatch ? canonicalMatch[1].trim() : null;

      // Extract robots
      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
      robots = robotsMatch ? robotsMatch[1].trim() : null;

      hasOpenGraph =
        /<meta[^>]*property=["']og:title["']/i.test(html) ||
        /<meta[^>]*property=["']og:description["']/i.test(html);
      hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);
      hasJsonLd = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);

      // Calculate approximate word count (strip HTML tag characters and count tokens)
      const textOnly = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      wordCount = textOnly.split(" ").filter(Boolean).length;

      // Validate Title
      if (!title) {
        score -= 15;
        recommendations.push("⚠️ **Missing Title Tag**: The page has no `<title>` tag. Page titles are highly weighted ranking factors.");
      } else if (title.length < 30 || title.length > 60) {
        score -= 5;
        recommendations.push(`⚠️ **Suboptimal Title Length**: Current title length is ${title.length} chars (optimal: 30-60). Title: "${title}"`);
      }

      // Validate Description
      if (!description) {
        score -= 15;
        recommendations.push("⚠️ **Missing Meta Description**: Adding a description improves search result click-through rates (optimal: 70-160 chars).");
      } else if (description.length < 70 || description.length > 160) {
        score -= 5;
        recommendations.push(`⚠️ **Suboptimal Meta Description Length**: Description length is ${description.length} chars (optimal: 70-160).`);
      }

      // Validate H1 headings
      if (h1Count === 0) {
        score -= 10;
        recommendations.push("⚠️ **Missing H1 Tag**: H1 tag gives search engines the primary structural topic. Add exactly one H1 to the page layout.");
      } else if (h1Count > 1) {
        score -= 8;
        recommendations.push(`⚠️ **Multiple H1 Tags (${h1Count})**: Avoid using more than one H1 per page. Use H2/H3 tags for subheaders.`);
      }

      // Validate word count
      if (wordCount < 300) {
        score -= 10;
        recommendations.push(`💡 **Thin Content Warning (${wordCount} words)**: Page has less than 300 words. Search crawlers prioritize deep, informational articles.`);
      }

      // Validate canonical link
      if (!canonical) {
        score -= 8;
        recommendations.push("⚠️ **Missing Canonical URL**: Explicitly specify the canonical URL link to avoid duplicate content flags.");
      }

      // Validate robots noindex
      if (robots && robots.toLowerCase().includes("noindex")) {
        score -= 20;
        recommendations.push("⚠️ **Noindex Robots Tag Active**: This page explicitly blocks indexing. Remove `noindex` if you want search traffic.");
      }

      if (!hasOpenGraph) {
        score -= 5;
        recommendations.push(
          "💡 **Missing Open Graph tags**: Add `og:title` and `og:description` so social shares and AI crawlers get a rich preview.",
        );
      }

      if (!hasOgImage) {
        score -= 5;
        recommendations.push(
          "💡 **Missing Open Graph image**: Add `og:image` (1200×630 recommended) for better click-through on social and link previews.",
        );
      }

      if (!hasJsonLd) {
        score -= 4;
        recommendations.push(
          "💡 **No JSON-LD structured data**: Add FAQPage, SoftwareApplication, or WebPage schema to help search engines understand the page.",
        );
      }
    } else if (bDesktopRes.status !== 200 && !isError) {
      const target = bDesktopRes.redirectTarget || "another page";
      const isB2cMarketplace =
        cleanPath === "/shop" ||
        cleanPath === "/shops" ||
        cleanPath === "/designs" ||
        cleanPath.startsWith("/shops/");
      if (isB2cMarketplace) {
        recommendations.push(
          `ℹ️ **Marketplace redirect**: ${cleanPath} sends guests home while customer marketplace flow is off. Googlebot still received HTTP ${gMobileRes.status}.`,
        );
      } else {
        score -= 10;
        recommendations.push(
          `🔄 **Redirect Active**: This path redirects desktop visitors to ${target}. Verify that this matches user intent.`,
        );
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine status badge
    let status: "SUCCESS" | "WARNING" | "ERROR" = "SUCCESS";
    if (score < 50 || isError || isGooglebotRedirectedToLogin) {
      status = "ERROR";
    } else if (score < 90) {
      status = "WARNING";
    }

    return {
      path: cleanPath,
      score,
      status,
      title,
      description,
      h1Count,
      wordCount,
      canonical,
      robots,
      hasOpenGraph,
      hasOgImage,
      hasJsonLd,
      recommendations,
      crawlResults: {
        googlebotMobile: { status: gMobileRes.status, redirectTarget: gMobileRes.redirectTarget },
        googlebotDesktop: { status: gDesktopRes.status, redirectTarget: gDesktopRes.redirectTarget },
        browserDesktop: { status: bDesktopRes.status, redirectTarget: bDesktopRes.redirectTarget },
        browserMobile: { status: bMobileRes.status, redirectTarget: bMobileRes.redirectTarget },
      },
    };
  }

  // Fallback failure report builder
  private generateFailedPageReport(pathname: string, errorMsg: string): SeoAuditPageReport {
    return {
      path: pathname,
      score: 0,
      status: "ERROR",
      title: null,
      description: null,
      h1Count: 0,
      wordCount: 0,
      canonical: null,
      robots: null,
      hasOpenGraph: false,
      hasOgImage: false,
      hasJsonLd: false,
      recommendations: [`❌ **Fetch Failure**: Auditor bot failed to request page content: ${errorMsg}`],
      crawlResults: {
        googlebotMobile: { status: 500, redirectTarget: null },
        googlebotDesktop: { status: 500, redirectTarget: null },
        browserDesktop: { status: 500, redirectTarget: null },
        browserMobile: { status: 500, redirectTarget: null },
      },
    };
  }

  // Network Fetch abstraction capturing redirect paths directly
  private async simulatedFetch(
    url: string,
    userAgent: string,
  ): Promise<{ status: number; redirectTarget: string | null; html?: string }> {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": userAgent },
        redirect: "manual", // Do NOT auto-follow so we can audit redirect codes!
      });

      // Handle server-side redirects (HTTP 3xx status)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        return {
          status: response.status,
          redirectTarget: location,
        };
      }

      // 200 OK or errors (404, 500 etc)
      let htmlContent: string | undefined;
      if (response.status === 200) {
        htmlContent = await response.text();
      }

      return {
        status: response.status,
        redirectTarget: null,
        html: htmlContent,
      };
    } catch (err) {
      this.logger.warn(`Fetch connection error on ${url}: ${String(err)}`);
      return {
        status: 502, // Bad Gateway connection
        redirectTarget: null,
      };
    }
  }
}
