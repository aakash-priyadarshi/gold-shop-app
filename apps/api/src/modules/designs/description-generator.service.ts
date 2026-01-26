import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  consecutiveFailures: number;
  lastAlertSentAt: Date | null;
}

/**
 * Hugging Face Free Tier Limits (as of 2024):
 * - ~30,000 requests/month for inference API
 * - Rate limit: ~1 request/second
 * - Model loading time: First request may be slow (cold start)
 * 
 * This service implements:
 * 1. Primary: Hugging Face Flan-T5-Large API
 * 2. Fallback: Pre-built templates
 * 3. Queue system for rate-limited requests
 * 4. 24-hour cooldown when limits are hit
 * 5. Admin alerts on failures
 */
@Injectable()
export class DescriptionGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(DescriptionGeneratorService.name);
  
  // Hugging Face API configuration
  private readonly HF_API_URL = 'https://api-inference.huggingface.co/models/google/flan-t5-large';
  private readonly HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN; // Optional but recommended
  
  // Rate limiting state (in production, use Redis for distributed state)
  private rateLimitState: RateLimitState = {
    isLimited: false,
    limitedAt: null,
    resumeAt: null,
    consecutiveFailures: 0,
    lastAlertSentAt: null,
  };
  
  // In-memory queue (in production, use database or Redis queue)
  private descriptionQueue: QueuedDescription[] = [];
  
  // Rate limit thresholds
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly COOLDOWN_HOURS = 24;
  private readonly ALERT_COOLDOWN_HOURS = 6; // Don't spam admins
  
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    // Load any pending queue items from database on startup
    await this.loadQueueFromDatabase();
    this.logger.log('Description Generator Service initialized');
  }

  /**
   * Main entry point - generates description with fallback handling
   */
  async generateDescription(designId: string, specs: JewelrySpecs): Promise<string> {
    // Check if we're rate limited
    if (this.isRateLimited()) {
      this.logger.warn(`Rate limited - adding design ${designId} to queue`);
      await this.addToQueue(designId, specs);
      // Return template immediately while queued for AI generation later
      return this.generateTemplateDescription(specs);
    }

    try {
      // Try AI generation first
      const aiDescription = await this.generateWithHuggingFace(specs);
      
      if (aiDescription) {
        // Reset failure counter on success
        this.rateLimitState.consecutiveFailures = 0;
        return aiDescription;
      }
      
      // AI returned empty, use template
      return this.generateTemplateDescription(specs);
    } catch (error) {
      this.handleApiError(error, designId, specs);
      return this.generateTemplateDescription(specs);
    }
  }

  /**
   * Generate description using Hugging Face API
   */
  private async generateWithHuggingFace(specs: JewelrySpecs): Promise<string | null> {
    const prompt = this.buildPrompt(specs);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add token if available (higher rate limits)
      if (this.HF_TOKEN) {
        headers['Authorization'] = `Bearer ${this.HF_TOKEN}`;
      }

      const response = await fetch(this.HF_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true,
          },
          options: {
            wait_for_model: true, // Wait if model is loading
          },
        }),
      });

      // Handle rate limiting response
      if (response.status === 429) {
        this.logger.warn('Hugging Face rate limit hit (429)');
        this.activateRateLimit('API returned 429 Too Many Requests');
        return null;
      }

      // Handle model loading (503)
      if (response.status === 503) {
        const data = await response.json();
        if (data.error?.includes('loading')) {
          this.logger.log('Model is loading, will retry...');
          // Wait and retry once
          await this.sleep(10000);
          return this.generateWithHuggingFace(specs);
        }
        return null;
      }

      if (!response.ok) {
        this.logger.error(`HuggingFace API error: ${response.status}`);
        return null;
      }

      const result = await response.json();
      
      // Handle array response format
      if (Array.isArray(result) && result[0]?.generated_text) {
        return this.cleanGeneratedText(result[0].generated_text, prompt);
      }
      
      // Handle object response format
      if (result.generated_text) {
        return this.cleanGeneratedText(result.generated_text, prompt);
      }

      return null;
    } catch (error) {
      this.logger.error('HuggingFace API call failed:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for the AI model
   */
  private buildPrompt(specs: JewelrySpecs): string {
    const metalDesc = this.getMetalDescription(specs);
    const gemstoneDesc = specs.hasGemstones 
      ? ` adorned with ${specs.gemstoneShape || ''} ${specs.gemstoneType || 'gemstone'}`.trim()
      : '';
    const finishDesc = specs.surfaceFinish ? ` with ${this.formatFinish(specs.surfaceFinish)} finish` : '';

    return `Write a short, elegant product description (2-3 sentences) for this jewelry piece:
Type: ${this.formatJewelryType(specs.jewelryType)}
Metal: ${metalDesc}${gemstoneDesc}${finishDesc}

Description:`;
  }

  /**
   * Clean up the AI generated text
   */
  private cleanGeneratedText(text: string, prompt: string): string {
    // Remove the prompt if it's included in response
    let cleaned = text.replace(prompt, '').trim();
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(Description:|Here is|Here's|This is)\s*/i, '').trim();
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    // Ensure it ends with a period
    if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!')) {
      cleaned += '.';
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
    
    // Opening adjectives pool
    const openingAdjectives = this.getOpeningAdjectives(specs);
    const opening = openingAdjectives[Math.floor(Math.random() * openingAdjectives.length)];
    
    // Build gemstone clause
    const gemstoneClause = specs.hasGemstones 
      ? this.buildGemstoneClause(specs)
      : '';
    
    // Closing statements pool
    const closingStatements = this.getClosingStatements(specs);
    const closing = closingStatements[Math.floor(Math.random() * closingStatements.length)];
    
    // Construct the description based on jewelry type
    let description = '';
    
    switch (specs.jewelryType?.toUpperCase()) {
      case 'RING':
        description = `${opening} ring crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case 'NECKLACE':
        description = `${opening} necklace fashioned in ${metalDesc}${gemstoneClause}${finishDesc}. This elegant piece drapes gracefully, ${closing.toLowerCase()}`;
        break;
      case 'PENDANT':
        description = `${opening} pendant created in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case 'BRACELET':
        description = `${opening} bracelet designed in ${metalDesc}${gemstoneClause}${finishDesc}. This stunning piece wraps the wrist in elegance, ${closing.toLowerCase()}`;
        break;
      case 'BANGLE':
        description = `${opening} bangle handcrafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case 'EARRING':
      case 'EARRINGS':
        description = `${opening} earrings crafted in ${metalDesc}${gemstoneClause}${finishDesc}. These exquisite pieces frame the face with sophistication, ${closing.toLowerCase()}`;
        break;
      case 'CHAIN':
        description = `${opening} chain meticulously crafted in ${metalDesc}${finishDesc}. ${closing}`;
        break;
      case 'ANKLET':
        description = `${opening} anklet designed in ${metalDesc}${gemstoneClause}${finishDesc}. This delicate piece adds a touch of elegance, ${closing.toLowerCase()}`;
        break;
      case 'NOSE_PIN':
        description = `${opening} nose pin delicately crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
        break;
      case 'MANGALSUTRA':
        description = `${opening} mangalsutra traditionally crafted in ${metalDesc}${gemstoneClause}${finishDesc}. This sacred piece symbolizes eternal love and commitment.`;
        break;
      case 'MAANG_TIKKA':
        description = `${opening} maang tikka elegantly designed in ${metalDesc}${gemstoneClause}${finishDesc}. This traditional piece adorns the forehead with timeless grace.`;
        break;
      default:
        description = `${opening} ${jewelryType.toLowerCase()} crafted in ${metalDesc}${gemstoneClause}${finishDesc}. ${closing}`;
    }
    
    return description;
  }

  /**
   * Get pool of opening adjectives based on jewelry specs
   */
  private getOpeningAdjectives(specs: JewelrySpecs): string[] {
    const base = ['An exquisite', 'A stunning', 'An elegant', 'A beautiful', 'A magnificent'];
    
    if (specs.hasGemstones) {
      return [...base, 'A dazzling', 'A brilliant', 'A radiant', 'A captivating'];
    }
    
    if (specs.karat?.includes('22') || specs.karat?.includes('24')) {
      return [...base, 'A luxurious', 'A premium', 'An opulent'];
    }
    
    return base;
  }

  /**
   * Get pool of closing statements
   */
  private getClosingStatements(specs: JewelrySpecs): string[] {
    const base = [
      'Perfect for both everyday elegance and special occasions.',
      'A timeless piece that celebrates fine craftsmanship.',
      'Designed to be treasured for generations.',
      'A perfect blend of tradition and contemporary style.',
    ];
    
    if (specs.hasGemstones) {
      return [
        ...base,
        'The gemstone catches light beautifully, creating a mesmerizing display.',
        'A stunning piece where precious metal meets brilliant stone.',
      ];
    }
    
    return base;
  }

  /**
   * Build gemstone clause for description
   */
  private buildGemstoneClause(specs: JewelrySpecs): string {
    if (!specs.hasGemstones) return '';
    
    const stone = specs.gemstoneType ? this.formatGemstone(specs.gemstoneType) : 'gemstone';
    const shape = specs.gemstoneShape ? `${this.formatShape(specs.gemstoneShape)} ` : '';
    const color = specs.gemstoneColor ? `${specs.gemstoneColor.toLowerCase()} ` : '';
    const setting = specs.settingStyle ? ` in a ${this.formatSetting(specs.settingStyle)} setting` : '';
    
    // Vary the phrasing
    const phrases = [
      `, adorned with a ${color}${shape}${stone}${setting}`,
      `, featuring a stunning ${color}${shape}${stone}${setting}`,
      `, embellished with a brilliant ${color}${shape}${stone}${setting}`,
      `, crowned with a captivating ${color}${shape}${stone}${setting}`,
    ];
    
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Get full metal description
   */
  private getMetalDescription(specs: JewelrySpecs): string {
    const color = specs.metalColor ? `${specs.metalColor.toLowerCase()} ` : '';
    const karat = specs.karat ? `${specs.karat} ` : '';
    const metal = this.formatMetal(specs.metalType);
    
    return `${karat}${color}${metal}`.trim();
  }

  /**
   * Get finish description
   */
  private getFinishDescription(finish?: string): string {
    if (!finish) return '';
    
    const formatted = this.formatFinish(finish);
    return ` with a ${formatted} finish`;
  }

  // ============ Formatting Helpers ============

  private formatJewelryType(type: string): string {
    return type?.replace(/_/g, ' ').toLowerCase() || 'jewelry';
  }

  private formatMetal(metal?: string): string {
    if (!metal) return 'precious metal';
    
    const metalMap: Record<string, string> = {
      'GOLD': 'gold',
      'GOLD_24K': '24-karat gold',
      'GOLD_22K': '22-karat gold',
      'GOLD_18K': '18-karat gold',
      'GOLD_14K': '14-karat gold',
      'SILVER': 'silver',
      'SILVER_925': 'sterling silver',
      'PLATINUM': 'platinum',
      'ROSE_GOLD': 'rose gold',
      'WHITE_GOLD': 'white gold',
    };
    
    return metalMap[metal] || metal.replace(/_/g, ' ').toLowerCase();
  }

  private formatFinish(finish?: string): string {
    if (!finish) return '';
    
    const finishMap: Record<string, string> = {
      'HIGH_POLISH': 'lustrous high-polish',
      'MATTE': 'refined matte',
      'BRUSHED': 'elegant brushed',
      'HAMMERED': 'artisanal hammered',
      'TEXTURED': 'beautifully textured',
      'SATIN': 'smooth satin',
    };
    
    return finishMap[finish] || finish.replace(/_/g, ' ').toLowerCase();
  }

  private formatGemstone(stone?: string): string {
    if (!stone) return 'gemstone';
    
    const stoneMap: Record<string, string> = {
      'DIAMOND_NATURAL': 'natural diamond',
      'DIAMOND_LAB': 'lab-grown diamond',
      'RUBY': 'ruby',
      'EMERALD': 'emerald',
      'SAPPHIRE': 'sapphire',
      'PEARL': 'pearl',
      'AMETHYST': 'amethyst',
      'TOPAZ': 'topaz',
      'OPAL': 'opal',
      'GARNET': 'garnet',
    };
    
    return stoneMap[stone] || stone.replace(/_/g, ' ').toLowerCase();
  }

  private formatShape(shape?: string): string {
    if (!shape) return '';
    
    const shapeMap: Record<string, string> = {
      'ROUND': 'round-cut',
      'OVAL': 'oval-cut',
      'PRINCESS': 'princess-cut',
      'CUSHION': 'cushion-cut',
      'EMERALD': 'emerald-cut',
      'PEAR': 'pear-shaped',
      'MARQUISE': 'marquise-cut',
      'HEART': 'heart-shaped',
      'RADIANT': 'radiant-cut',
      'ASSCHER': 'asscher-cut',
    };
    
    return shapeMap[shape] || shape.replace(/_/g, ' ').toLowerCase();
  }

  private formatSetting(setting?: string): string {
    if (!setting) return '';
    
    const settingMap: Record<string, string> = {
      'PRONG': 'classic prong',
      'BEZEL': 'sleek bezel',
      'CHANNEL': 'elegant channel',
      'PAVE': 'sparkling pavé',
      'HALO': 'dazzling halo',
      'TENSION': 'modern tension',
      'FLUSH': 'seamless flush',
    };
    
    return settingMap[setting] || setting.replace(/_/g, ' ').toLowerCase();
  }

  // ============ Rate Limiting & Queue Management ============

  /**
   * Check if we're currently rate limited
   */
  private isRateLimited(): boolean {
    if (!this.rateLimitState.isLimited) return false;
    
    // Check if cooldown period has passed
    if (this.rateLimitState.resumeAt && new Date() >= this.rateLimitState.resumeAt) {
      this.logger.log('Rate limit cooldown period ended, resuming API calls');
      this.rateLimitState.isLimited = false;
      this.rateLimitState.limitedAt = null;
      this.rateLimitState.resumeAt = null;
      this.rateLimitState.consecutiveFailures = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Activate rate limiting with cooldown
   */
  private activateRateLimit(reason: string): void {
    const now = new Date();
    const resumeAt = new Date(now.getTime() + this.COOLDOWN_HOURS * 60 * 60 * 1000);
    
    this.rateLimitState = {
      isLimited: true,
      limitedAt: now,
      resumeAt,
      consecutiveFailures: this.rateLimitState.consecutiveFailures + 1,
      lastAlertSentAt: this.rateLimitState.lastAlertSentAt,
    };
    
    this.logger.warn(`Rate limit activated. Reason: ${reason}. Will resume at: ${resumeAt.toISOString()}`);
    
    // Send admin alert (with cooldown to avoid spam)
    this.sendAdminAlert(reason);
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any, designId: string, specs: JewelrySpecs): void {
    this.rateLimitState.consecutiveFailures++;
    
    this.logger.error(`API error for design ${designId}:`, error.message);
    
    // If too many consecutive failures, activate rate limit
    if (this.rateLimitState.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.activateRateLimit(`${this.MAX_CONSECUTIVE_FAILURES} consecutive API failures`);
      this.addToQueue(designId, specs);
    }
  }

  /**
   * Send alert to admin users
   */
  private async sendAdminAlert(reason: string): Promise<void> {
    const now = new Date();
    
    // Check alert cooldown
    if (this.rateLimitState.lastAlertSentAt) {
      const hoursSinceLastAlert = (now.getTime() - this.rateLimitState.lastAlertSentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < this.ALERT_COOLDOWN_HOURS) {
        this.logger.log('Skipping admin alert - cooldown period active');
        return;
      }
    }
    
    try {
      // Get all admin users
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      
      const resumeTime = this.rateLimitState.resumeAt?.toLocaleString() || 'Unknown';
      const queueSize = this.descriptionQueue.length;
      
      // Create notification for each admin
      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'SYSTEM',
          titleKey: 'notifications.ai_service_alert.title',
          titleParams: {},
          bodyKey: 'notifications.ai_service_alert.body',
          bodyParams: {
            reason,
            queueSize,
            resumeTime,
          },
          channels: ['IN_APP', 'EMAIL'],
        });
      }
      
      this.rateLimitState.lastAlertSentAt = now;
      this.logger.log(`Admin alert sent to ${admins.length} admins`);
    } catch (error) {
      this.logger.error('Failed to send admin alert:', error);
    }
  }

  /**
   * Add design to queue for later processing
   */
  private async addToQueue(designId: string, specs: JewelrySpecs): Promise<void> {
    // Check if already in queue
    if (this.descriptionQueue.some(item => item.designId === designId)) {
      return;
    }
    
    const queueItem: QueuedDescription = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      designId,
      specs,
      createdAt: new Date(),
    };
    
    this.descriptionQueue.push(queueItem);
    
    // Persist to database
    await this.saveQueueToDatabase();
    
    this.logger.log(`Added design ${designId} to queue. Queue size: ${this.descriptionQueue.length}`);
  }

  /**
   * Save queue to database for persistence across restarts
   */
  private async saveQueueToDatabase(): Promise<void> {
    try {
      // Use SystemConfig or a dedicated table
      await this.prisma.systemConfig.upsert({
        where: { key: 'description_generation_queue' },
        update: { value: JSON.stringify(this.descriptionQueue) },
        create: { 
          key: 'description_generation_queue', 
          value: JSON.stringify(this.descriptionQueue),
        },
      });
    } catch (error) {
      this.logger.error('Failed to save queue to database:', error);
    }
  }

  /**
   * Load queue from database on startup
   */
  private async loadQueueFromDatabase(): Promise<void> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key: 'description_generation_queue' },
      });
      
      if (config?.value && typeof config.value === 'string') {
        this.descriptionQueue = JSON.parse(config.value);
        this.logger.log(`Loaded ${this.descriptionQueue.length} items from queue`);
      }
    } catch (error) {
      this.logger.error('Failed to load queue from database:', error);
      this.descriptionQueue = [];
    }
  }

  /**
   * Process queued descriptions - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processQueue(): Promise<void> {
    // Don't process if rate limited
    if (this.isRateLimited()) {
      this.logger.log('Queue processing skipped - still rate limited');
      return;
    }
    
    if (this.descriptionQueue.length === 0) {
      return;
    }
    
    this.logger.log(`Processing description queue. Items: ${this.descriptionQueue.length}`);
    
    const processedIds: string[] = [];
    
    for (const item of this.descriptionQueue) {
      // Check rate limit again (might get triggered during processing)
      if (this.isRateLimited()) {
        break;
      }
      
      try {
        const description = await this.generateWithHuggingFace(item.specs);
        
        if (description) {
          // Update the design with AI-generated description
          await this.prisma.design.update({
            where: { id: item.designId },
            data: {
              additionalSpecs: {
                // Preserve existing specs
                ...(await this.getExistingAdditionalSpecs(item.designId)),
                description,
                descriptionSource: 'AI',
                descriptionGeneratedAt: new Date().toISOString(),
              },
            },
          });
          
          processedIds.push(item.id);
          this.logger.log(`Successfully processed queued description for design ${item.designId}`);
        }
        
        // Small delay between requests to be respectful to API
        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Failed to process queued item ${item.designId}:`, error);
        // Continue with next item
      }
    }
    
    // Remove processed items from queue
    this.descriptionQueue = this.descriptionQueue.filter(item => !processedIds.includes(item.id));
    await this.saveQueueToDatabase();
    
    this.logger.log(`Queue processing complete. Processed: ${processedIds.length}, Remaining: ${this.descriptionQueue.length}`);
  }

  /**
   * Get existing additionalSpecs for a design
   */
  private async getExistingAdditionalSpecs(designId: string): Promise<Record<string, any>> {
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

  /**
   * Get current service status (for admin dashboard)
   */
  getServiceStatus(): {
    isRateLimited: boolean;
    resumeAt: Date | null;
    queueSize: number;
    consecutiveFailures: number;
  } {
    return {
      isRateLimited: this.rateLimitState.isLimited,
      resumeAt: this.rateLimitState.resumeAt,
      queueSize: this.descriptionQueue.length,
      consecutiveFailures: this.rateLimitState.consecutiveFailures,
    };
  }

  /**
   * Utility: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
