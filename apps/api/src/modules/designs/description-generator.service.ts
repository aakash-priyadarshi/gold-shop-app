import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

interface JewelrySpecs {
  jewelryType: string;
  metalType: string;
  metalColor?: string;
  karat?: string;
  surfaceFinish?: string;
  hasGemstones: boolean;
  gemstoneType?: string;
  gemstoneShape?: string;
  gemstoneColor?: string;
  settingStyle?: string;
}

interface QueuedDescription {
  id: string;
  designId: string;
  specs: JewelrySpecs;
  createdAt: Date;
}

interface RateLimitState {
  isLimited: boolean;
  limitedAt: Date | null;
  resumeAt: Date | null;
  dailyRequestCount: number;
  dailyResetAt: Date | null;
  lastAlertSentAt: Date | null;
}

interface ServiceConfig {
  dailyRequestLimit: number;
  cooldownHours: number;
  alertCooldownHours: number;
}

/**
 * Gemini Flash Pricing (as of 2024):
 * - Input: ~$0.35 per 1M tokens
 * - Output: ~$1.05 per 1M tokens
 * - Cost per description request: ~$0.00007
 *
 * This service implements:
 * 1. Primary: Google Gemini Flash API
 * 2. Fallback: Pre-built templates
 * 3. Queue system for rate-limited requests
 * 4. Configurable daily request limits (default: 1M/day)
 * 5. Admin alerts on failures
 * 6. Admin-configurable rate limits
 */
@Injectable()
export class DescriptionGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(DescriptionGeneratorService.name);

  // Gemini API configuration
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;

  // Rate limiting state
  private rateLimitState: RateLimitState = {
    isLimited: false,
    limitedAt: null,
    resumeAt: null,
    dailyRequestCount: 0,
    dailyResetAt: null,
    lastAlertSentAt: null,
  };

  // In-memory queue
  private descriptionQueue: QueuedDescription[] = [];

  // Default configuration (can be overridden from admin panel)
  private config: ServiceConfig = {
    dailyRequestLimit: 1000000, // 1 million per day
    cooldownHours: 24,
    alertCooldownHours: 6,
  };

  // Config keys for database storage
  private readonly CONFIG_KEYS = {
    QUEUE: "description_generation_queue",
    RATE_LIMIT_STATE: "description_rate_limit_state",
    SERVICE_CONFIG: "description_service_config",
  };

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  async onModuleInit() {
    await this.loadConfigFromDatabase();
    await this.loadRateLimitStateFromDatabase();
    await this.loadQueueFromDatabase();
    this.initializeDailyReset();
    this.logger.log(
      "Description Generator Service initialized with Gemini Flash",
    );
    this.logger.log(
      `Daily request limit: ${this.config.dailyRequestLimit.toLocaleString()}`,
    );
  }

  /**
   * Initialize daily request counter reset
   */
  private initializeDailyReset(): void {
    const now = new Date();
    if (
      !this.rateLimitState.dailyResetAt ||
      now >= this.rateLimitState.dailyResetAt
    ) {
      this.resetDailyCounter();
    }
  }

  /**
   * Reset daily request counter
   */
  private resetDailyCounter(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    this.rateLimitState.dailyRequestCount = 0;
    this.rateLimitState.dailyResetAt = tomorrow;
    this.rateLimitState.isLimited = false;
    this.rateLimitState.limitedAt = null;
    this.rateLimitState.resumeAt = null;

    this.saveRateLimitStateToDatabase();
    this.logger.log("Daily request counter reset");
  }

  /**
   * Main entry point - generates description with fallback handling
   */
  async generateDescription(
    designId: string,
    specs: JewelrySpecs,
  ): Promise<string> {
    // Check daily reset
    if (
      this.rateLimitState.dailyResetAt &&
      new Date() >= this.rateLimitState.dailyResetAt
    ) {
      this.resetDailyCounter();
    }

    // Check if we're rate limited
    if (this.isRateLimited()) {
      this.logger.warn(`Rate limited - adding design ${designId} to queue`);
      await this.addToQueue(designId, specs);
      return this.generateTemplateDescription(specs);
    }

    // Check API key
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - using template");
      return this.generateTemplateDescription(specs);
    }

    try {
      const aiDescription = await this.generateWithGemini(specs);

      if (aiDescription) {
        this.rateLimitState.dailyRequestCount++;
        await this.saveRateLimitStateToDatabase();
        return aiDescription;
      }

      return this.generateTemplateDescription(specs);
    } catch (error) {
      this.handleApiError(error, designId, specs);
      return this.generateTemplateDescription(specs);
    }
  }

  /**
   * Generate description using Gemini Flash API
   */
  private async generateWithGemini(
    specs: JewelrySpecs,
  ): Promise<string | null> {
    const prompt = this.buildPrompt(specs);

    try {
      const response = await fetch(
        `${this.GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 100, // ~200 characters max
              topP: 0.9,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              },
            ],
          }),
        },
      );

      // Handle rate limiting (429)
      if (response.status === 429) {
        this.logger.warn("Gemini rate limit hit (429)");
        this.activateRateLimit("API returned 429 Too Many Requests");
        return null;
      }

      // Handle quota exceeded
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes("quota")) {
          this.logger.warn("Gemini quota exceeded");
          this.activateRateLimit("API quota exceeded");
          return null;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Gemini API error: ${response.status} - ${errorText}`,
        );
        return null;
      }

      const result = await response.json();

      // Extract text from Gemini response
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return this.cleanGeneratedText(generatedText);
      }

      return null;
    } catch (error) {
      this.logger.error("Gemini API call failed:", error);
      throw error;
    }
  }

  /**
   * Build the prompt for Gemini
   */
  private buildPrompt(specs: JewelrySpecs): string {
    const metalDesc = this.getMetalDescription(specs);
    const gemstoneDesc = specs.hasGemstones
      ? ` with ${specs.gemstoneShape || ""} ${specs.gemstoneType || "gemstone"}`.trim()
      : "";
    const finishDesc = specs.surfaceFinish
      ? ` and ${this.formatFinish(specs.surfaceFinish)} finish`
      : "";

    return `Write a single elegant jewelry product description in 1-2 sentences (max 200 characters).

Jewelry: ${this.formatJewelryType(specs.jewelryType)}
Metal: ${metalDesc}${gemstoneDesc}${finishDesc}

Requirements:
- Be concise and luxurious
- Highlight craftsmanship
- No bullet points or lists
- Just the description text, no labels`;
  }

  /**
   * Clean up the AI generated text
   */
  private cleanGeneratedText(text: string): string {
    let cleaned = text.trim();

    // Remove common prefixes
    cleaned = cleaned
      .replace(
        /^(Description:|Here is|Here's|This is|Product Description:)\s*/i,
        "",
      )
      .trim();

    // Remove quotes if present
    cleaned = cleaned.replace(/^["']|["']$/g, "").trim();

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    // Ensure it ends with a period
    if (cleaned && !cleaned.endsWith(".") && !cleaned.endsWith("!")) {
      cleaned += ".";
    }

    // Truncate to 200 characters if needed
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 197) + "...";
    }

    return cleaned;
  }

  /**
   * Fallback: Generate description using pre-built templates
   */
  generateTemplateDescription(specs: JewelrySpecs): string {
    const jewelryType = this.formatJewelryType(specs.jewelryType);
    const metalDesc = this.getMetalDescription(specs);
    const finishDesc = this.getFinishDescription(specs.surfaceFinish);

    const openingAdjectives = this.getOpeningAdjectives(specs);
    const opening =
      openingAdjectives[Math.floor(Math.random() * openingAdjectives.length)];

    const gemstoneClause = specs.hasGemstones
      ? this.buildGemstoneClause(specs)
      : "";

    const closingStatements = this.getClosingStatements(specs);
    const closing =
      closingStatements[Math.floor(Math.random() * closingStatements.length)];

    let description = "";

    switch (specs.jewelryType?.toUpperCase()) {
      case "RING":
        description = `${opening} ring crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case "NECKLACE":
        description = `${opening} necklace fashioned in ${metalDesc}${gemstoneClause}${finishDesc}. This elegant piece drapes gracefully.`;
        break;
      case "PENDANT":
        description = `${opening} pendant created in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case "BRACELET":
        description = `${opening} bracelet designed in ${metalDesc}${gemstoneClause}${finishDesc}. A stunning piece for the wrist.`;
        break;
      case "BANGLE":
        description = `${opening} bangle handcrafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case "EARRING":
      case "EARRINGS":
        description = `${opening} earrings crafted in ${metalDesc}${gemstoneClause}${finishDesc}. Frames the face with elegance.`;
        break;
      case "CHAIN":
        description = `${opening} chain meticulously crafted in ${metalDesc}${finishDesc}. ${closing}`;
        break;
      case "ANKLET":
        description = `${opening} anklet designed in ${metalDesc}${gemstoneClause}${finishDesc}. A delicate touch of elegance.`;
        break;
      case "NOSE_PIN":
        description = `${opening} nose pin delicately crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case "MANGALSUTRA":
        description = `${opening} mangalsutra traditionally crafted in ${metalDesc}${gemstoneClause}${finishDesc}. A sacred symbol of love.`;
        break;
      case "MAANG_TIKKA":
        description = `${opening} maang tikka elegantly designed in ${metalDesc}${gemstoneClause}${finishDesc}. Traditional grace.`;
        break;
      default:
        description = `${opening} ${jewelryType.toLowerCase()} crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
    }

    // Ensure template descriptions are also max 200 chars
    if (description.length > 200) {
      description = description.substring(0, 197) + "...";
    }

    return description;
  }

  /**
   * Get pool of opening adjectives based on jewelry specs
   */
  private getOpeningAdjectives(specs: JewelrySpecs): string[] {
    const base = [
      "An exquisite",
      "A stunning",
      "An elegant",
      "A beautiful",
      "A magnificent",
    ];

    if (specs.hasGemstones) {
      return [...base, "A dazzling", "A brilliant", "A radiant"];
    }

    if (specs.karat?.includes("22") || specs.karat?.includes("24")) {
      return [...base, "A luxurious", "A premium"];
    }

    return base;
  }

  /**
   * Get pool of closing statements
   */
  private getClosingStatements(specs: JewelrySpecs): string[] {
    const base = [
      "Perfect for any occasion.",
      "Timeless craftsmanship.",
      "Designed to be treasured.",
    ];

    if (specs.hasGemstones) {
      return [...base, "Brilliance meets elegance."];
    }

    return base;
  }

  /**
   * Build gemstone clause for description
   */
  private buildGemstoneClause(specs: JewelrySpecs): string {
    if (!specs.hasGemstones) return "";

    const stone = specs.gemstoneType
      ? this.formatGemstone(specs.gemstoneType)
      : "gemstone";
    const shape = specs.gemstoneShape
      ? `${this.formatShape(specs.gemstoneShape)} `
      : "";

    const phrases = [
      `, adorned with a ${shape}${stone}`,
      `, featuring a ${shape}${stone}`,
      `, with a stunning ${shape}${stone}`,
    ];

    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Get full metal description
   */
  private getMetalDescription(specs: JewelrySpecs): string {
    const color = specs.metalColor ? `${specs.metalColor.toLowerCase()} ` : "";
    const karat = specs.karat ? `${specs.karat} ` : "";
    const metal = this.formatMetal(specs.metalType);

    return `${karat}${color}${metal}`.trim();
  }

  /**
   * Get finish description
   */
  private getFinishDescription(finish?: string): string {
    if (!finish) return "";
    const formatted = this.formatFinish(finish);
    return ` with ${formatted} finish`;
  }

  // ============ Formatting Helpers ============

  private formatJewelryType(type: string): string {
    return type?.replace(/_/g, " ").toLowerCase() || "jewelry";
  }

  private formatMetal(metal?: string): string {
    if (!metal) return "precious metal";

    const metalMap: Record<string, string> = {
      GOLD: "gold",
      GOLD_24K: "24K gold",
      GOLD_22K: "22K gold",
      GOLD_18K: "18K gold",
      GOLD_14K: "14K gold",
      SILVER: "silver",
      SILVER_925: "sterling silver",
      PLATINUM: "platinum",
      ROSE_GOLD: "rose gold",
      WHITE_GOLD: "white gold",
    };

    return metalMap[metal] || metal.replace(/_/g, " ").toLowerCase();
  }

  private formatFinish(finish?: string): string {
    if (!finish) return "";

    const finishMap: Record<string, string> = {
      HIGH_POLISH: "high-polish",
      MATTE: "matte",
      BRUSHED: "brushed",
      HAMMERED: "hammered",
      TEXTURED: "textured",
      SATIN: "satin",
    };

    return finishMap[finish] || finish.replace(/_/g, " ").toLowerCase();
  }

  private formatGemstone(stone?: string): string {
    if (!stone) return "gemstone";

    const stoneMap: Record<string, string> = {
      DIAMOND_NATURAL: "natural diamond",
      DIAMOND_LAB: "lab-grown diamond",
      RUBY: "ruby",
      EMERALD: "emerald",
      SAPPHIRE: "sapphire",
      PEARL: "pearl",
      AMETHYST: "amethyst",
      TOPAZ: "topaz",
      OPAL: "opal",
      GARNET: "garnet",
    };

    return stoneMap[stone] || stone.replace(/_/g, " ").toLowerCase();
  }

  private formatShape(shape?: string): string {
    if (!shape) return "";

    const shapeMap: Record<string, string> = {
      ROUND: "round-cut",
      OVAL: "oval-cut",
      PRINCESS: "princess-cut",
      CUSHION: "cushion-cut",
      EMERALD: "emerald-cut",
      PEAR: "pear-shaped",
      MARQUISE: "marquise-cut",
      HEART: "heart-shaped",
    };

    return shapeMap[shape] || shape.replace(/_/g, " ").toLowerCase();
  }

  // ============ Rate Limiting & Queue Management ============

  /**
   * Check if we're currently rate limited
   */
  private isRateLimited(): boolean {
    // Check if daily limit exceeded
    if (
      this.rateLimitState.dailyRequestCount >= this.config.dailyRequestLimit
    ) {
      if (!this.rateLimitState.isLimited) {
        this.activateRateLimit("Daily request limit reached");
      }
      return true;
    }

    // Check cooldown
    if (this.rateLimitState.isLimited && this.rateLimitState.resumeAt) {
      if (new Date() >= this.rateLimitState.resumeAt) {
        this.rateLimitState.isLimited = false;
        this.rateLimitState.limitedAt = null;
        this.rateLimitState.resumeAt = null;
        this.saveRateLimitStateToDatabase();
        this.logger.log("Rate limit cooldown ended");
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Activate rate limiting with cooldown
   */
  private activateRateLimit(reason: string): void {
    const now = new Date();
    const resumeAt = new Date(
      now.getTime() + this.config.cooldownHours * 60 * 60 * 1000,
    );

    this.rateLimitState.isLimited = true;
    this.rateLimitState.limitedAt = now;
    this.rateLimitState.resumeAt = resumeAt;

    this.saveRateLimitStateToDatabase();
    this.logger.warn(
      `Rate limit activated. Reason: ${reason}. Resume at: ${resumeAt.toISOString()}`,
    );

    this.sendAdminAlert(reason);
  }

  /**
   * Handle API errors
   */
  private handleApiError(
    error: any,
    designId: string,
    specs: JewelrySpecs,
  ): void {
    this.logger.error(`API error for design ${designId}:`, error.message);
    // Add to queue for retry
    this.addToQueue(designId, specs);
  }

  /**
   * Send alert to admin users
   */
  private async sendAdminAlert(reason: string): Promise<void> {
    const now = new Date();

    if (this.rateLimitState.lastAlertSentAt) {
      const hoursSinceLastAlert =
        (now.getTime() - this.rateLimitState.lastAlertSentAt.getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLastAlert < this.config.alertCooldownHours) {
        return;
      }
    }

    try {
      const admins = await this.prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      const resumeTime =
        this.rateLimitState.resumeAt?.toLocaleString() || "Unknown";
      const queueSize = this.descriptionQueue.length;
      const dailyUsage = `${this.rateLimitState.dailyRequestCount.toLocaleString()}/${this.config.dailyRequestLimit.toLocaleString()}`;

      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: "SYSTEM",
          titleKey: "notifications.ai_service_alert.title",
          titleParams: {},
          bodyKey: "notifications.ai_service_alert.body",
          bodyParams: {
            reason,
            queueSize,
            resumeTime,
            dailyUsage,
          },
          channels: ["IN_APP", "EMAIL"],
        });
      }

      this.rateLimitState.lastAlertSentAt = now;
      this.saveRateLimitStateToDatabase();
      this.logger.log(`Admin alert sent to ${admins.length} admins`);
    } catch (error) {
      this.logger.error("Failed to send admin alert:", error);
    }
  }

  /**
   * Add design to queue for later processing
   */
  private async addToQueue(
    designId: string,
    specs: JewelrySpecs,
  ): Promise<void> {
    if (this.descriptionQueue.some((item) => item.designId === designId)) {
      return;
    }

    const queueItem: QueuedDescription = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      designId,
      specs,
      createdAt: new Date(),
    };

    this.descriptionQueue.push(queueItem);
    await this.saveQueueToDatabase();

    this.logger.log(
      `Added design ${designId} to queue. Queue size: ${this.descriptionQueue.length}`,
    );
  }

  // ============ Database Persistence ============

  private async saveQueueToDatabase(): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key: this.CONFIG_KEYS.QUEUE },
        update: { value: JSON.stringify(this.descriptionQueue) },
        create: {
          key: this.CONFIG_KEYS.QUEUE,
          value: JSON.stringify(this.descriptionQueue),
        },
      });
    } catch (error) {
      this.logger.error("Failed to save queue:", error);
    }
  }

  private async loadQueueFromDatabase(): Promise<void> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: this.CONFIG_KEYS.QUEUE },
      });

      if (config?.value && typeof config.value === "string") {
        this.descriptionQueue = JSON.parse(config.value);
        this.logger.log(
          `Loaded ${this.descriptionQueue.length} items from queue`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to load queue:", error);
      this.descriptionQueue = [];
    }
  }

  private async saveRateLimitStateToDatabase(): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key: this.CONFIG_KEYS.RATE_LIMIT_STATE },
        update: { value: JSON.stringify(this.rateLimitState) },
        create: {
          key: this.CONFIG_KEYS.RATE_LIMIT_STATE,
          value: JSON.stringify(this.rateLimitState),
        },
      });
    } catch (error) {
      this.logger.error("Failed to save rate limit state:", error);
    }
  }

  private async loadRateLimitStateFromDatabase(): Promise<void> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: this.CONFIG_KEYS.RATE_LIMIT_STATE },
      });

      if (config?.value && typeof config.value === "string") {
        const stored = JSON.parse(config.value);
        this.rateLimitState = {
          ...this.rateLimitState,
          ...stored,
          dailyResetAt: stored.dailyResetAt
            ? new Date(stored.dailyResetAt)
            : null,
          limitedAt: stored.limitedAt ? new Date(stored.limitedAt) : null,
          resumeAt: stored.resumeAt ? new Date(stored.resumeAt) : null,
          lastAlertSentAt: stored.lastAlertSentAt
            ? new Date(stored.lastAlertSentAt)
            : null,
        };
        this.logger.log(
          `Loaded rate limit state. Daily count: ${this.rateLimitState.dailyRequestCount}`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to load rate limit state:", error);
    }
  }

  private async saveConfigToDatabase(): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key: this.CONFIG_KEYS.SERVICE_CONFIG },
        update: { value: JSON.stringify(this.config) },
        create: {
          key: this.CONFIG_KEYS.SERVICE_CONFIG,
          value: JSON.stringify(this.config),
        },
      });
    } catch (error) {
      this.logger.error("Failed to save config:", error);
    }
  }

  private async loadConfigFromDatabase(): Promise<void> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: this.CONFIG_KEYS.SERVICE_CONFIG },
      });

      if (config?.value && typeof config.value === "string") {
        const stored = JSON.parse(config.value);
        this.config = { ...this.config, ...stored };
        this.logger.log(
          `Loaded config. Daily limit: ${this.config.dailyRequestLimit}`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to load config:", error);
    }
  }

  // ============ Cron Jobs ============

  /**
   * Process queued descriptions - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processQueue(): Promise<void> {
    if (this.isRateLimited()) {
      this.logger.log("Queue processing skipped - rate limited");
      return;
    }

    if (this.descriptionQueue.length === 0) {
      return;
    }

    this.logger.log(`Processing queue. Items: ${this.descriptionQueue.length}`);

    const processedIds: string[] = [];

    for (const item of this.descriptionQueue) {
      if (this.isRateLimited()) break;

      try {
        const description = await this.generateWithGemini(item.specs);

        if (description) {
          const existingSpecs = await this.getExistingAdditionalSpecs(
            item.designId,
          );

          await this.prisma.design.update({
            where: { id: item.designId },
            data: {
              additionalSpecs: {
                ...existingSpecs,
                description,
                descriptionSource: "AI",
                descriptionGeneratedAt: new Date().toISOString(),
              },
            },
          });

          this.rateLimitState.dailyRequestCount++;
          processedIds.push(item.id);
          this.logger.log(`Processed queued design ${item.designId}`);
        }

        // Small delay between requests
        await this.sleep(500);
      } catch (error) {
        this.logger.error(`Failed to process ${item.designId}:`, error);
      }
    }

    this.descriptionQueue = this.descriptionQueue.filter(
      (item) => !processedIds.includes(item.id),
    );
    await this.saveQueueToDatabase();
    await this.saveRateLimitStateToDatabase();

    this.logger.log(
      `Queue processed. Done: ${processedIds.length}, Remaining: ${this.descriptionQueue.length}`,
    );
  }

  /**
   * Daily reset cron job - runs at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyReset(): Promise<void> {
    this.logger.log("Running daily reset");
    this.resetDailyCounter();
  }

  private async getExistingAdditionalSpecs(
    designId: string,
  ): Promise<Record<string, any>> {
    try {
      const design = await this.prisma.design.findUnique({
        where: { id: designId },
        select: { additionalSpecs: true },
      });
      return (design?.additionalSpecs as Record<string, any>) || {};
    } catch {
      return {};
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============ Admin API Methods ============

  /**
   * Get current service status (for admin dashboard)
   */
  getServiceStatus(): {
    isRateLimited: boolean;
    resumeAt: Date | null;
    queueSize: number;
    dailyRequestCount: number;
    dailyRequestLimit: number;
    dailyResetAt: Date | null;
    usagePercentage: number;
    estimatedCost: string;
  } {
    const usagePercentage = Math.round(
      (this.rateLimitState.dailyRequestCount / this.config.dailyRequestLimit) *
        100,
    );
    // Cost: ~$0.00007 per request
    const estimatedCost = `$${(this.rateLimitState.dailyRequestCount * 0.00007).toFixed(4)}`;

    return {
      isRateLimited: this.rateLimitState.isLimited,
      resumeAt: this.rateLimitState.resumeAt,
      queueSize: this.descriptionQueue.length,
      dailyRequestCount: this.rateLimitState.dailyRequestCount,
      dailyRequestLimit: this.config.dailyRequestLimit,
      dailyResetAt: this.rateLimitState.dailyResetAt,
      usagePercentage,
      estimatedCost,
    };
  }

  /**
   * Update daily request limit (admin only)
   */
  async updateDailyLimit(
    newLimit: number,
  ): Promise<{ success: boolean; message: string }> {
    if (newLimit < 1000) {
      return {
        success: false,
        message: "Limit must be at least 1,000 requests",
      };
    }

    if (newLimit > 10000000) {
      return {
        success: false,
        message: "Limit cannot exceed 10 million requests",
      };
    }

    this.config.dailyRequestLimit = newLimit;
    await this.saveConfigToDatabase();

    // If we were rate limited due to daily limit and new limit is higher, remove limit
    if (
      this.rateLimitState.isLimited &&
      this.rateLimitState.dailyRequestCount < newLimit
    ) {
      this.rateLimitState.isLimited = false;
      this.rateLimitState.limitedAt = null;
      this.rateLimitState.resumeAt = null;
      await this.saveRateLimitStateToDatabase();
    }

    this.logger.log(`Daily limit updated to ${newLimit.toLocaleString()}`);
    return {
      success: true,
      message: `Daily limit updated to ${newLimit.toLocaleString()} requests`,
    };
  }

  /**
   * Reset rate limit manually (admin only)
   */
  async resetRateLimit(): Promise<{ success: boolean; message: string }> {
    this.rateLimitState.isLimited = false;
    this.rateLimitState.limitedAt = null;
    this.rateLimitState.resumeAt = null;
    await this.saveRateLimitStateToDatabase();

    this.logger.log("Rate limit manually reset by admin");
    return { success: true, message: "Rate limit has been reset" };
  }

  /**
   * Clear the queue (admin only)
   */
  async clearQueue(): Promise<{
    success: boolean;
    message: string;
    clearedCount: number;
  }> {
    const count = this.descriptionQueue.length;
    this.descriptionQueue = [];
    await this.saveQueueToDatabase();

    this.logger.log(`Queue cleared. Removed ${count} items`);
    return {
      success: true,
      message: `Cleared ${count} items from queue`,
      clearedCount: count,
    };
  }

  /**
   * Force process queue now (admin only)
   */
  async forceProcessQueue(): Promise<{ success: boolean; message: string }> {
    if (this.descriptionQueue.length === 0) {
      return { success: false, message: "Queue is empty" };
    }

    // Run queue processing
    await this.processQueue();

    return {
      success: true,
      message: `Queue processing triggered. Remaining: ${this.descriptionQueue.length}`,
    };
  }
}
