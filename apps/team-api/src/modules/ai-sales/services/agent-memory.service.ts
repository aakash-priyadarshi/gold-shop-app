import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

type MemorySeed = { category: string; key: string; value: string; label: string };

const CURATED_MEMORY_SEEDS: MemorySeed[] = [
  { category: "company", key: "name", value: "Orivraa", label: "Company Name" },
  { category: "company", key: "description", value: "Orivraa is an AI-powered jewellery business CRM and commerce platform built specifically for jewellers. It combines CRM, inventory, billing, digital catalogues, RFQ handling, buyer chat, analytics, and marketplace selling in one cloud dashboard.", label: "Company Description" },
  { category: "company", key: "tagline", value: "Run your jewellery business from one dashboard.", label: "Tagline" },
  { category: "company", key: "proof_points", value: "Trusted by 2,000+ jewellers. Active across India, Nepal, UAE, UK, USA and Europe. Setup takes under 5 minutes. Free plan available with no credit card required.", label: "Proof Points" },
  { category: "company", key: "target_customers", value: "Retail jewellery shops, wholesale gold dealers, custom jewellery designers, and online jewellery sellers who need CRM plus operations in one system.", label: "Target Customers" },
  { category: "company", key: "supported_markets", value: "India, Nepal, UAE, UK, USA, and Europe with multi-currency pricing and country-specific tax handling.", label: "Supported Markets" },
  { category: "company", key: "support_model", value: "Free sellers can start immediately. Pro sellers get priority support. Enterprise customers get a dedicated account manager and custom integrations.", label: "Support Model" },
  { category: "company", key: "sales_phone", value: "+91 6203965557", label: "Sales Phone" },
  { category: "company", key: "sales_email", value: "info@orivraa.com", label: "Sales Email" },

  { category: "phones", key: "twilio_phone", value: "", label: "Twilio Phone Number" },
  { category: "phones", key: "whatsapp_number", value: "", label: "WhatsApp Business Number" },
  { category: "phones", key: "caller_id", value: "", label: "Caller ID (shown to customers)" },

  { category: "urls", key: "pricing_url", value: "https://www.orivraa.com/pricing", label: "Pricing Page URL" },
  { category: "urls", key: "calendar_url", value: "https://www.orivraa.com/auth/register", label: "Primary CTA / Signup URL" },
  { category: "urls", key: "case_study_url", value: "https://www.orivraa.com/seller-guide", label: "Seller Guide URL" },
  { category: "urls", key: "comparison_url", value: "https://www.orivraa.com/jewellery-shop-software", label: "Product Comparison URL" },
  { category: "urls", key: "contract_url", value: "https://www.orivraa.com/terms", label: "Terms / Agreement URL" },
  { category: "urls", key: "summary_url", value: "https://www.orivraa.com/jewellery-shop-software", label: "Product Summary URL" },
  { category: "urls", key: "seller_guide_url", value: "https://www.orivraa.com/seller-guide", label: "Seller Guide URL" },
  { category: "urls", key: "product_url", value: "https://www.orivraa.com/jewellery-shop-software", label: "Jewellery CRM Product URL" },
  { category: "urls", key: "support_url", value: "https://www.orivraa.com/support", label: "Support URL" },

  { category: "persona", key: "agent_name", value: "Aria", label: "AI Agent Name" },
  { category: "persona", key: "agent_tone", value: "warm, consultative, confident, non-pushy, product-savvy, and deeply aware of jewellery retail workflows", label: "Agent Tone" },
  { category: "persona", key: "language", value: "en", label: "Primary Language" },
  { category: "persona", key: "mission", value: "Qualify jewellers, understand how they currently manage stock, billing, catalogues, and customer follow-up, then position Orivraa as the easiest all-in-one jewellery CRM and commerce platform.", label: "Sales Mission" },
  { category: "persona", key: "discovery_focus", value: "Current software, manual processes, Excel/WhatsApp dependency, GST billing, inventory by purity and weight, catalogue sharing, RFQ handling, online selling, branch management, and growth goals.", label: "Discovery Focus" },

  { category: "product", key: "name", value: "Orivraa Jewellery CRM", label: "Product Name" },
  { category: "product", key: "elevator_pitch", value: "A cloud-based jewellery shop CRM and business operating system that helps jewellers manage inventory, billing, customer relationships, catalogues, RFQs, analytics, AI tools, and marketplace sales from one dashboard.", label: "Elevator Pitch" },
  { category: "product", key: "core_features", value: "CRM suite, inventory management, customer management, invoicing and billing, analytics dashboard, buyer chat, RFQ, digital catalogues, AI tools, marketplace listing, multi-currency pricing, and multi-branch support on paid plans.", label: "Core Features" },
  { category: "product", key: "inventory_management", value: "Track gold, silver, diamonds, and gemstones by weight, purity (24K/22K/18K), making charges, hallmarks, variants, and low-stock alerts. Bulk upload via CSV is supported.", label: "Inventory Management" },
  { category: "product", key: "catalogues", value: "Create digital catalogues with photos, prices, and descriptions. Share them on WhatsApp, Instagram, email, or embed on websites. Catalogues auto-sync with inventory.", label: "Digital Catalogues" },
  { category: "product", key: "billing", value: "Generate professional invoices with GST/VAT support, automatic tax handling, making charges, stone charges, old gold exchange, and custom line items.", label: "Billing & Invoicing" },
  { category: "product", key: "crm_suite", value: "Maintain customer profiles, track purchase history, manage buyer chat, follow up on enquiries, receive RFQs for custom orders, and log all conversations in one place.", label: "CRM Suite" },
  { category: "product", key: "analytics", value: "View revenue, popular products, enquiries, conversion rates, cash flow, profit trends, seasonal performance, and customer behavior from one dashboard.", label: "Analytics" },
  { category: "product", key: "ai_tools", value: "AI product descriptions, smart tagging, pricing suggestions, smart recommendations, price optimisation, demand forecasting, and AI design generation on supported plans.", label: "AI Tools" },
  { category: "product", key: "marketplace", value: "Products can be listed on Orivraa's international marketplace and seen by buyers across 6+ countries. Priority placement is available for higher plans.", label: "Marketplace Reach" },
  { category: "product", key: "setup_time", value: "Sign up in under 2 minutes and get started in under 5 minutes. No installation, no server setup, no credit card required for the free plan.", label: "Setup Time" },
  { category: "product", key: "onboarding", value: "Step 1: sign up free. Step 2: set up shop details, tax, and banking. Step 3: add products with images, weight, purity, and pricing. Step 4: go live, chat with buyers, send invoices, and manage everything from the dashboard.", label: "Onboarding Flow" },
  { category: "product", key: "differentiators", value: "Purpose-built for jewellers, not a generic CRM. Built-in marketplace, weight and purity tracking, digital catalogues, RFQ, country-specific taxes, multi-currency pricing, AI tools, and fast setup.", label: "Key Differentiators" },
  { category: "product", key: "competitor_comparison", value: "Compared with Zoho, Marg ERP, and Vyapar: Orivraa starts free, is purpose-built for jewellery, includes marketplace selling, digital catalogues, buyer chat, RFQ, AI descriptions, and global multi-currency support.", label: "Competitor Comparison" },
  { category: "product", key: "pricing_summary", value: "Free plan: ₹0/month with up to 15 listings and core tools. Pro: ₹299/month with unlimited products, AI tools, priority listing, staff accounts, and multi-branch support. Pro+: ₹599/month with 100 AI credits, API access, and more automation. Enterprise: custom pricing, white-label, custom integrations, dedicated account manager, and 500 AI credits/month.", label: "Pricing Summary" },
  { category: "product", key: "free_plan", value: "₹0/month, 15 listings, marketplace listing, CRM suite, inventory, invoicing, customer management, analytics, and purchasable AI credits.", label: "Free Plan" },
  { category: "product", key: "pro_plan", value: "₹299/month, unlimited listings, CRM suite, inventory, invoicing, analytics, AI features, priority listing, priority support, staff accounts, and multi-branch support.", label: "Pro Plan" },
  { category: "product", key: "pro_plus_plan", value: "₹599/month, everything in Pro plus 100 AI credits/month, API access, stronger automation, and 4.5% platform commission.", label: "Pro+ Plan" },
  { category: "product", key: "enterprise_plan", value: "Custom pricing for large operations with lowest commission, dedicated account manager, API access, white-label option, custom domain, custom integrations, and 500 AI credits/month.", label: "Enterprise Plan" },
  { category: "product", key: "ideal_customers", value: "Jewellers currently juggling Excel, WhatsApp, billing tools, and manual follow-up. Shops that want to centralize operations, sell online, and reach international buyers are the best fit.", label: "Ideal Customer Profile" },
  { category: "product", key: "qualification_questions", value: "What do you currently use for inventory and billing? How do you share catalogues today? Do you handle custom RFQs or WhatsApp enquiries? Are you selling only locally or also online/internationally? Do you manage multiple staff or branches?", label: "Qualification Questions" },
  { category: "product", key: "seller_success_tips", value: "Use clear photos, complete your shop profile, price transparently, respond within 1 hour, update inventory weekly, and build reviews. These actions increase trust, enquiries, and conversions on Orivraa.", label: "Seller Success Tips" },

  { category: "advanced", key: "audio_mode", value: "deepgram", label: "Audio Mode (deepgram or gemini_live)" },
  { category: "advanced", key: "stt_provider", value: "auto", label: "STT Provider (auto, deepgram, or sarvam)" },
  { category: "advanced", key: "tts_provider", value: "elevenlabs", label: "TTS Provider (elevenlabs or inworld)" },
  { category: "advanced", key: "claude_escalation_threshold", value: "500", label: "Claude Escalation Threshold ($)" },
  { category: "advanced", key: "inworld_api_key", value: "", label: "Inworld API Key" },
  { category: "advanced", key: "inworld_voice_id", value: "", label: "Inworld Voice ID" },
  { category: "advanced", key: "stt_keywords", value: "Orivraa,jewellery CRM,jewellery shop software,RFQ,GST,VAT,making charges,purity,24K,22K,18K,916,hallmark,catalogue,inventory,billing,Pro Plus,multi-branch,marketplace,diamond,gold,silver,gemstone", label: "STT Keyword Boosting (comma-separated)" },
];

const PROTECTED_MEMORY_KEYS = new Set([
  "phones:twilio_phone",
  "phones:whatsapp_number",
  "phones:caller_id",
  "advanced:inworld_api_key",
  "advanced:inworld_voice_id",
]);

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
  private readonly DEFAULTS: Record<string, string> = Object.fromEntries(
    CURATED_MEMORY_SEEDS.map((entry) => [`${entry.category}:${entry.key}`, entry.value]),
  );

  private readonly DEFAULT_LABELS: Record<string, string> = Object.fromEntries(
    CURATED_MEMORY_SEEDS.map((entry) => [`${entry.category}:${entry.key}`, entry.label]),
  );

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.loadAll();
    } catch (err: any) {
      this.logger.warn(`Initial cache load failed (table may not exist yet): ${err.message}`);
    }
    // Refresh cache every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadAll().catch((err) =>
        this.logger.warn("Cache refresh failed", err.message),
      );
    }, 300_000);
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
    const entries = await this.prisma.agentMemory.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const merged = new Map<string, { id: string; category: string; key: string; value: string; label: string | null }>();
    for (const entry of entries) {
      merged.set(`${entry.category}:${entry.key}`, entry);
    }

    for (const [cacheKey, value] of Object.entries(this.DEFAULTS)) {
      if (merged.has(cacheKey)) continue;
      const [category, key] = cacheKey.split(":");
      merged.set(cacheKey, {
        id: `default:${cacheKey}`,
        category,
        key,
        value,
        label: this.DEFAULT_LABELS[cacheKey] ?? key,
      });
    }

    return Array.from(merged.values()).sort((a, b) => {
      if (a.category === b.category) return a.key.localeCompare(b.key);
      return a.category.localeCompare(b.category);
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
    const existing = await this.prisma.agentMemory.findMany({
      select: { category: true, key: true, value: true },
    });
    const existingMap = new Map(existing.map((entry) => [`${entry.category}:${entry.key}`, entry.value]));

    for (const seed of CURATED_MEMORY_SEEDS) {
      const cacheKey = `${seed.category}:${seed.key}`;
      const existingValue = existingMap.get(cacheKey);
      const shouldPreserveExisting =
        PROTECTED_MEMORY_KEYS.has(cacheKey) &&
        existingValue !== undefined &&
        existingValue.trim().length > 0;

      await this.prisma.agentMemory.upsert({
        where: { category_key: { category: seed.category, key: seed.key } },
        create: seed,
        update: {
          value: shouldPreserveExisting ? existingValue : seed.value,
          label: seed.label,
        },
      });
    }

    await this.loadAll();
    return CURATED_MEMORY_SEEDS.length;
  }
}
