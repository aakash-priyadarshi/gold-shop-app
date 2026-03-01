import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

// ─── Types ──────────────────────────────────────────────────
export enum ThreatType {
  AUTH_BRUTE_FORCE = "AUTH_BRUTE_FORCE",
  AUTH_CREDENTIAL_STUFFING = "AUTH_CREDENTIAL_STUFFING",
  ACCESS_FORBIDDEN = "ACCESS_FORBIDDEN",
  ACCESS_IDOR_ATTEMPT = "ACCESS_IDOR_ATTEMPT",
  INPUT_INJECTION = "INPUT_INJECTION",
  ENUM_SCRAPING = "ENUM_SCRAPING",
  API_FUZZING = "API_FUZZING",
  RATE_EXCEEDED = "RATE_EXCEEDED",
  PRICE_TAMPERING = "PRICE_TAMPERING",
  SUSPICIOUS_AGENT = "SUSPICIOUS_AGENT",
}

export enum Severity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

export interface ThreatEvent {
  type: ThreatType;
  severity: Severity;
  ip: string;
  userId?: string;
  route: string;
  method: string;
  userAgent?: string;
  details?: Record<string, any>;
  blocked?: boolean;
}

export interface IpProfile {
  score: number; // 0 = clean, 100 = max threat
  events: number;
  firstSeen: number;
  lastSeen: number;
  failedLogins: number;
  injectionAttempts: number;
  forbiddenHits: number;
  notFoundHits: number;
  recentRequests: number[]; // timestamps of last N requests
}

// ─── SQL / XSS injection patterns ──────────────────────────
const INJECTION_PATTERNS = [
  // SQL injection
  /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|where|set|values)\b)/i,
  /(--|#|\/\*|\*\/|;[\s]*$)/,
  /(\b(or|and)\b\s+[\d'"]\s*[=<>])/i,
  /([\'"]\s*(or|and)\s*[\'"]\s*[=])/i,
  /(\bsleep\s*\(|\bbenchmark\s*\()/i,
  // XSS
  /(<script[\s>]|javascript\s*:|on(load|error|click|mouse|focus|blur)\s*=)/i,
  /(document\.(cookie|location|write)|window\.(location|open))/i,
  // Path traversal
  /(\.\.\/|\.\.\\|%2e%2e)/i,
  // Command injection
  /([;|`]\s*(cat|ls|dir|wget|curl|bash|sh|cmd|powershell)\b)/i,
];

// Suspicious user agents
const SUSPICIOUS_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /havij/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /burpsuite/i,
  /hydra/i,
  /metasploit/i,
  /^$/,
];

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  // In-memory IP profiles for fast scoring (evicted periodically)
  private ipProfiles = new Map<string, IpProfile>();
  // Recent events buffer for dashboard (last 200)
  private recentEvents: ThreatEvent[] = [];
  // Auto-block thresholds
  private readonly BLOCK_SCORE_THRESHOLD = 70;
  private readonly BRUTE_FORCE_WINDOW_MS = 5 * 60 * 1000; // 5 min
  private readonly BRUTE_FORCE_MAX_ATTEMPTS = 6;
  private readonly FUZZING_WINDOW_MS = 60 * 1000; // 1 min
  private readonly FUZZING_MAX_404S = 20;
  private readonly TEMP_BAN_DURATION_MS = 15 * 60 * 1000; // 15 min

  // Blocked IPs cache (avoids DB read on every request)
  private blockedIpsCache = new Set<string>();
  private blockedIpsCacheUpdatedAt = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30s

  constructor(private readonly prisma: PrismaService) {
    this.refreshBlockedIpsCache();
  }

  // ─── Public Analysis Methods ────────────────────────────────

  /**
   * Main entry point: analyze an incoming request for threats.
   * Called by SecurityGuard on every request.
   */
  async analyzeRequest(req: {
    ip: string;
    method: string;
    route: string;
    userAgent?: string;
    userId?: string;
    body?: any;
    statusCode?: number;
  }): Promise<{ blocked: boolean; threats: ThreatEvent[] }> {
    const threats: ThreatEvent[] = [];
    const profile = this.getOrCreateProfile(req.ip);

    // Track request timestamp
    profile.recentRequests.push(Date.now());
    if (profile.recentRequests.length > 200) profile.recentRequests.shift();
    profile.lastSeen = Date.now();

    // 1. Check if IP is blocked
    if (await this.isBlocked(req.ip)) {
      return { blocked: true, threats: [] };
    }

    // 2. Detect injection in body/query
    if (req.body) {
      const injectionResult = this.detectInjection(req.body);
      if (injectionResult) {
        const event: ThreatEvent = {
          type: ThreatType.INPUT_INJECTION,
          severity: Severity.CRITICAL,
          ip: req.ip,
          userId: req.userId,
          route: req.route,
          method: req.method,
          userAgent: req.userAgent,
          details: { pattern: injectionResult },
          blocked: true,
        };
        threats.push(event);
        profile.injectionAttempts++;
        profile.score = Math.min(100, profile.score + 30);
      }
    }

    // 3. Detect suspicious user agent
    if (req.userAgent && this.isSuspiciousAgent(req.userAgent)) {
      const event: ThreatEvent = {
        type: ThreatType.SUSPICIOUS_AGENT,
        severity: Severity.MEDIUM,
        ip: req.ip,
        route: req.route,
        method: req.method,
        userAgent: req.userAgent,
        details: { userAgent: req.userAgent },
      };
      threats.push(event);
      profile.score = Math.min(100, profile.score + 15);
    }

    // 4. Detect API fuzzing (high 404 rate)
    // (called from response interceptor via recordResponse)

    // 5. Auto-block if score exceeds threshold
    if (profile.score >= this.BLOCK_SCORE_THRESHOLD) {
      await this.blockIp(
        req.ip,
        `Auto-blocked: threat score ${profile.score}`,
        Severity.HIGH,
        true,
        this.TEMP_BAN_DURATION_MS,
      );
      threats.forEach((t) => (t.blocked = true));
    }

    // 6. Persist threats
    if (threats.length > 0) {
      await this.persistEvents(threats);
    }

    return { blocked: profile.score >= this.BLOCK_SCORE_THRESHOLD, threats };
  }

  /**
   * Record a failed login attempt (called from AuthService or AuthController).
   */
  async recordFailedLogin(
    ip: string,
    route: string,
    userId?: string,
    userAgent?: string,
  ): Promise<void> {
    const profile = this.getOrCreateProfile(ip);
    profile.failedLogins++;
    profile.score = Math.min(100, profile.score + 10);

    // Check brute force window
    const recentTimestamps = profile.recentRequests.filter(
      (ts) => Date.now() - ts < this.BRUTE_FORCE_WINDOW_MS,
    );

    if (profile.failedLogins >= this.BRUTE_FORCE_MAX_ATTEMPTS) {
      const event: ThreatEvent = {
        type: ThreatType.AUTH_BRUTE_FORCE,
        severity: Severity.HIGH,
        ip,
        userId,
        route,
        method: "POST",
        userAgent,
        details: {
          failedAttempts: profile.failedLogins,
          windowMinutes: this.BRUTE_FORCE_WINDOW_MS / 60000,
          recentRequestsInWindow: recentTimestamps.length,
        },
        blocked: true,
      };
      await this.persistEvents([event]);
      await this.blockIp(
        ip,
        `Brute force: ${profile.failedLogins} failed logins`,
        Severity.HIGH,
        true,
        this.TEMP_BAN_DURATION_MS,
      );
      profile.score = 100;
    } else {
      const event: ThreatEvent = {
        type: ThreatType.AUTH_BRUTE_FORCE,
        severity: profile.failedLogins >= 3 ? Severity.MEDIUM : Severity.LOW,
        ip,
        userId,
        route,
        method: "POST",
        userAgent,
        details: { failedAttempts: profile.failedLogins },
      };
      await this.persistEvents([event]);
    }
  }

  /**
   * Record a successful login (resets failed login counter).
   */
  recordSuccessfulLogin(ip: string): void {
    const profile = this.ipProfiles.get(ip);
    if (profile) {
      profile.failedLogins = 0;
      profile.score = Math.max(0, profile.score - 20);
    }
  }

  /**
   * Record a 403 Forbidden response.
   */
  async recordForbidden(
    ip: string,
    route: string,
    method: string,
    userId?: string,
    userAgent?: string,
  ): Promise<void> {
    const profile = this.getOrCreateProfile(ip);
    profile.forbiddenHits++;
    profile.score = Math.min(100, profile.score + 8);

    const event: ThreatEvent = {
      type: ThreatType.ACCESS_FORBIDDEN,
      severity: profile.forbiddenHits >= 5 ? Severity.HIGH : Severity.MEDIUM,
      ip,
      userId,
      route,
      method,
      userAgent,
      details: { totalForbiddenHits: profile.forbiddenHits },
    };
    await this.persistEvents([event]);

    if (profile.forbiddenHits >= 10) {
      await this.blockIp(
        ip,
        `Repeated forbidden access: ${profile.forbiddenHits} hits`,
        Severity.HIGH,
        true,
        this.TEMP_BAN_DURATION_MS,
      );
    }
  }

  /**
   * Record a 404 response (for fuzzing detection).
   */
  async recordNotFound(
    ip: string,
    route: string,
    method: string,
    userAgent?: string,
  ): Promise<void> {
    const profile = this.getOrCreateProfile(ip);
    profile.notFoundHits++;

    // Count recent 404s within the fuzzing window
    const now = Date.now();
    const recent404s = profile.recentRequests.filter(
      (ts) => now - ts < this.FUZZING_WINDOW_MS,
    ).length;

    if (profile.notFoundHits >= this.FUZZING_MAX_404S) {
      profile.score = Math.min(100, profile.score + 25);
      const event: ThreatEvent = {
        type: ThreatType.API_FUZZING,
        severity: Severity.HIGH,
        ip,
        route,
        method,
        userAgent,
        details: {
          notFoundCount: profile.notFoundHits,
          recentRequestsInWindow: recent404s,
        },
        blocked: true,
      };
      await this.persistEvents([event]);
      await this.blockIp(
        ip,
        `API fuzzing detected: ${profile.notFoundHits} 404s`,
        Severity.HIGH,
        true,
        60 * 60 * 1000,
      ); // 1 hour
    }
  }

  /**
   * Record a rate-limit hit (429).
   */
  async recordRateLimited(
    ip: string,
    route: string,
    method: string,
    userAgent?: string,
  ): Promise<void> {
    const profile = this.getOrCreateProfile(ip);
    profile.score = Math.min(100, profile.score + 5);

    const event: ThreatEvent = {
      type: ThreatType.RATE_EXCEEDED,
      severity: Severity.LOW,
      ip,
      route,
      method,
      userAgent,
      details: { currentScore: profile.score },
    };
    await this.persistEvents([event]);
  }

  // ─── IP Blocking ───────────────────────────────────────────

  async isBlocked(ip: string): Promise<boolean> {
    // Refresh cache if stale
    if (Date.now() - this.blockedIpsCacheUpdatedAt > this.CACHE_TTL_MS) {
      await this.refreshBlockedIpsCache();
    }
    return this.blockedIpsCache.has(ip);
  }

  async blockIp(
    ip: string,
    reason: string,
    severity: string = Severity.HIGH,
    autoBlock: boolean = true,
    durationMs?: number,
  ): Promise<void> {
    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

    try {
      await this.prisma.blockedIp.upsert({
        where: { ip },
        create: { ip, reason, severity, autoBlock, expiresAt },
        update: { reason, severity, autoBlock, expiresAt },
      });
      this.blockedIpsCache.add(ip);
      this.logger.warn(
        `🛡️ Blocked IP: ${ip} — ${reason} (expires: ${expiresAt?.toISOString() ?? "never"})`,
      );
    } catch (err) {
      this.logger.error(`Failed to block IP ${ip}:`, err);
    }
  }

  async unblockIp(ip: string): Promise<void> {
    try {
      await this.prisma.blockedIp.deleteMany({ where: { ip } });
      this.blockedIpsCache.delete(ip);
      this.logger.log(`✅ Unblocked IP: ${ip}`);
    } catch (err) {
      this.logger.error(`Failed to unblock IP ${ip}:`, err);
    }
  }

  private async refreshBlockedIpsCache(): Promise<void> {
    try {
      const blocked = await this.prisma.blockedIp.findMany({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { ip: true },
      });
      this.blockedIpsCache = new Set(blocked.map((b) => b.ip));
      this.blockedIpsCacheUpdatedAt = Date.now();
    } catch (err) {
      this.logger.error("Failed to refresh blocked IPs cache:", err);
    }
  }

  // ─── Dashboard / Admin Queries ─────────────────────────────

  async getDashboard(): Promise<{
    summary: {
      totalEvents24h: number;
      criticalEvents24h: number;
      blockedIps: number;
      threatScore: number;
      topThreatType: string;
    };
    recentEvents: any[];
    blockedIps: any[];
    threatsByType: Record<string, number>;
    threatsBySeverity: Record<string, number>;
    topAttackedRoutes: { route: string; count: number }[];
    topOffendingIps: { ip: string; score: number; events: number }[];
  }> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalEvents24h,
      criticalEvents24h,
      blockedIps,
      recentEvents,
      eventsByType,
      eventsBySeverity,
    ] = await Promise.all([
      this.prisma.securityEvent.count({
        where: { createdAt: { gte: since24h } },
      }),
      this.prisma.securityEvent.count({
        where: { createdAt: { gte: since24h }, severity: "CRITICAL" },
      }),
      this.prisma.blockedIp.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.securityEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.securityEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since24h } },
        _count: true,
      }),
      this.prisma.securityEvent.groupBy({
        by: ["severity"],
        where: { createdAt: { gte: since24h } },
        _count: true,
      }),
    ]);

    // Top attacked routes
    const routeGroups = await this.prisma.securityEvent.groupBy({
      by: ["route"],
      where: { createdAt: { gte: since24h } },
      _count: true,
      orderBy: { _count: { route: "desc" } },
      take: 10,
    });

    // Top offending IPs from in-memory profiles
    const topIps = Array.from(this.ipProfiles.entries())
      .map(([ip, p]) => ({ ip, score: p.score, events: p.events }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Determine top threat type
    const threatsByType: Record<string, number> = {};
    eventsByType.forEach((g) => {
      threatsByType[g.type] = g._count;
    });
    const topThreatType =
      Object.entries(threatsByType).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "NONE";

    const threatsBySeverity: Record<string, number> = {};
    eventsBySeverity.forEach((g) => {
      threatsBySeverity[g.severity] = g._count;
    });

    // Average threat score across active profiles
    const profiles = Array.from(this.ipProfiles.values());
    const avgScore =
      profiles.length > 0
        ? Math.round(
            profiles.reduce((s, p) => s + p.score, 0) / profiles.length,
          )
        : 0;

    return {
      summary: {
        totalEvents24h,
        criticalEvents24h,
        blockedIps: blockedIps.length,
        threatScore: avgScore,
        topThreatType,
      },
      recentEvents,
      blockedIps,
      threatsByType,
      threatsBySeverity,
      topAttackedRoutes: routeGroups.map((g) => ({
        route: g.route,
        count: g._count,
      })),
      topOffendingIps: topIps,
    };
  }

  async getEvents(options: {
    page?: number;
    limit?: number;
    type?: string;
    severity?: string;
    ip?: string;
  }): Promise<{ events: any[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const where: any = {};
    if (options.type) where.type = options.type;
    if (options.severity) where.severity = options.severity;
    if (options.ip) where.ip = options.ip;

    const [events, total] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return { events, total };
  }

  async getBlockedIps(): Promise<any[]> {
    return this.prisma.blockedIp.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
    });
  }

  getIpProfile(ip: string): IpProfile | null {
    return this.ipProfiles.get(ip) || null;
  }

  // ─── Private Helpers ───────────────────────────────────────

  private getOrCreateProfile(ip: string): IpProfile {
    let profile = this.ipProfiles.get(ip);
    if (!profile) {
      profile = {
        score: 0,
        events: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        failedLogins: 0,
        injectionAttempts: 0,
        forbiddenHits: 0,
        notFoundHits: 0,
        recentRequests: [],
      };
      this.ipProfiles.set(ip, profile);
    }
    return profile;
  }

  private detectInjection(body: any): string | null {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(bodyStr)) {
        return pattern.source.substring(0, 80);
      }
    }
    return null;
  }

  private isSuspiciousAgent(userAgent: string): boolean {
    return SUSPICIOUS_AGENTS.some((pattern) => pattern.test(userAgent));
  }

  private async persistEvents(events: ThreatEvent[]): Promise<void> {
    try {
      await this.prisma.securityEvent.createMany({
        data: events.map((e) => ({
          type: e.type,
          severity: e.severity,
          ip: e.ip,
          userId: e.userId || null,
          route: e.route,
          method: e.method,
          userAgent: e.userAgent || null,
          details: e.details || {},
          blocked: e.blocked || false,
        })),
      });

      // Update in-memory recent events
      for (const e of events) {
        this.recentEvents.unshift(e);
        const profile = this.ipProfiles.get(e.ip);
        if (profile) profile.events++;
      }
      if (this.recentEvents.length > 200) {
        this.recentEvents = this.recentEvents.slice(0, 200);
      }
    } catch (err) {
      this.logger.error("Failed to persist security events:", err);
    }
  }

  // ─── Scheduled Jobs ────────────────────────────────────────

  /** Decay IP scores every 5 minutes so stale profiles don't stay flagged */
  @Cron(CronExpression.EVERY_5_MINUTES)
  handleScoreDecay(): void {
    const now = Date.now();
    for (const [ip, profile] of this.ipProfiles.entries()) {
      // Decay score by 5 every 5 min if no recent activity
      if (now - profile.lastSeen > 5 * 60 * 1000) {
        profile.score = Math.max(0, profile.score - 5);
      }
      // Evict profiles inactive for 2 hours with score 0
      if (now - profile.lastSeen > 2 * 60 * 60 * 1000 && profile.score === 0) {
        this.ipProfiles.delete(ip);
      }
    }
  }

  /** Clean up expired blocks every 10 minutes */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredBlocks(): Promise<void> {
    try {
      const result = await this.prisma.blockedIp.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
      if (result.count > 0) {
        this.logger.log(`🔓 Expired ${result.count} IP blocks`);
        await this.refreshBlockedIpsCache();
      }
    } catch (err) {
      this.logger.error("Failed to clean expired blocks:", err);
    }
  }

  /** Purge security events older than 90 days */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleEventPurge(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.securityEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        this.logger.log(`🗑️ Purged ${result.count} old security events`);
      }
    } catch (err) {
      this.logger.error("Failed to purge old security events:", err);
    }
  }
}
