import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Database-backed config for mutable business data.
 * Replaces env vars for things that change (phone numbers, URLs, company info).
 *
 * Uses an in-memory cache refreshed every 60 seconds — fast reads,
 * no DB hit on every call. Changes via UI take effect within 60s.
 *
 * Categories:
 *   company  — company name, description, tagline
 *   phones   — twilio_phone, whatsapp_number, caller_id
 *   urls     — pricing_url, calendar_url, case_study_url, etc.
 *   persona  — agent_name, agent_tone, language
 *   product  — product descriptions, pricing tiers
 *   region   — region-specific config
 */
@Injectable()
export class AgentMemoryService implements OnModuleInit {
  private readonly logger = new Logger(AgentMemoryService.name);
  private cache = new Map<string, string>(); // "category:key" → value
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Default fallbacks — used when DB has no value yet
  private readonly DEFAULTS: Record<string, string> = {
    "company:name": "Orivraa",
    "company:description": "Gold investment and jewelry platform",
    "phones:twilio_phone": "",
    "phones:whatsapp_number": "",
    "phones:caller_id": "",
    "urls:pricing_url": "https://orivraa.com/pricing",
    "urls:calendar_url": "https://orivraa.com/book",
    "urls:case_study_url": "https://orivraa.com/case-studies",
    "urls:comparison_url": "https://orivraa.com/compare",
    "urls:contract_url": "https://orivraa.com/agreement",
    "urls:summary_url": "https://orivraa.com/summary",
    "persona:agent_name": "Aria",
    "persona:agent_tone": "warm, professional, conversational",
    "persona:language": "en",
  };

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadAll();
    // Refresh cache every 60 seconds
    this.refreshInterval = setInterval(() => {
      this.loadAll().catch((err) =>
        this.logger.warn("Cache refresh failed", err.message),
      );
    }, 60_000);
  }

  /** Load all memory entries into cache */
  private async loadAll() {
    const entries = await this.prisma.agentMemory.findMany();
    const newCache = new Map<string, string>();
    for (const entry of entries) {
      newCache.set(`${entry.category}:${entry.key}`, entry.value);
    }
    this.cache = newCache;
    this.logger.debug(`Agent memory loaded: ${entries.length} entries`);
  }

  /** Get a single value by category + key. Returns default or empty string. */
  get(category: string, key: string): string {
    const cacheKey = `${category}:${key}`;
    return this.cache.get(cacheKey) ?? this.DEFAULTS[cacheKey] ?? "";
  }

  /** Get all entries for a category */
  getCategory(category: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.cache.entries()) {
      if (k.startsWith(`${category}:`)) {
        result[k.replace(`${category}:`, "")] = v;
      }
    }
    // Fill in defaults
    for (const [k, v] of Object.entries(this.DEFAULTS)) {
      if (k.startsWith(`${category}:`)) {
        const shortKey = k.replace(`${category}:`, "");
        if (!(shortKey in result)) result[shortKey] = v;
      }
    }
    return result;
  }

  /** Get all entries grouped by category */
  async getAll(): Promise<Array<{ id: string; category: string; key: string; value: string; label: string | null }>> {
    return this.prisma.agentMemory.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  /** Upsert a single entry */
  async set(category: string, key: string, value: string, label?: string): Promise<void> {
    await this.prisma.agentMemory.upsert({
      where: { category_key: { category, key } },
      create: { category, key, value, label },
      update: { value, ...(label !== undefined && { label }) },
    });
    // Update cache immediately
    this.cache.set(`${category}:${key}`, value);
  }

  /** Bulk upsert — for saving form data from the UI */
  async bulkSet(entries: Array<{ category: string; key: string; value: string; label?: string }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.category, entry.key, entry.value, entry.label);
    }
  }

  /** Delete a single entry */
  async remove(category: string, key: string): Promise<void> {
    await this.prisma.agentMemory.deleteMany({
      where: { category, key },
    });
    this.cache.delete(`${category}:${key}`);
  }

  /** Force cache refresh (called after UI save) */
  async refresh(): Promise<void> {
    await this.loadAll();
  }

  /** Seed default entries if DB is empty — run once on first deploy */
  async seedDefaults(): Promise<number> {
    const existing = await this.prisma.agentMemory.count();
    if (existing > 0) return 0;

    const seeds: Array<{ category: string; key: string; value: string; label: string }> = [
      // Company
      { category: "company", key: "name", value: "Orivraa", label: "Company Name" },
      { category: "company", key: "description", value: "Gold investment and jewelry platform", label: "Description" },
      { category: "company", key: "tagline", value: "Trusted gold investment partner", label: "Tagline" },

      // Phone numbers
      { category: "phones", key: "twilio_phone", value: "", label: "Twilio Phone Number" },
      { category: "phones", key: "whatsapp_number", value: "", label: "WhatsApp Business Number" },
      { category: "phones", key: "caller_id", value: "", label: "Caller ID (shown to customers)" },

      // URLs
      { category: "urls", key: "pricing_url", value: "https://orivraa.com/pricing", label: "Pricing Page URL" },
      { category: "urls", key: "calendar_url", value: "https://orivraa.com/book", label: "Demo Booking URL" },
      { category: "urls", key: "case_study_url", value: "https://orivraa.com/case-studies", label: "Case Study URL" },
      { category: "urls", key: "comparison_url", value: "https://orivraa.com/compare", label: "Competitor Comparison URL" },
      { category: "urls", key: "contract_url", value: "https://orivraa.com/agreement", label: "Contract/Agreement URL" },
      { category: "urls", key: "summary_url", value: "https://orivraa.com/summary", label: "Call Summary URL" },

      // AI Persona
      { category: "persona", key: "agent_name", value: "Aria", label: "AI Agent Name" },
      { category: "persona", key: "agent_tone", value: "warm, professional, conversational", label: "Agent Tone" },
      { category: "persona", key: "language", value: "en", label: "Primary Language" },
    ];

    await this.prisma.agentMemory.createMany({ data: seeds });
    await this.loadAll();
    return seeds.length;
  }
}
