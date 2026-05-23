import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createHash } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { MarketRegion } from "../../market-rates/types";
import { DEFAULT_TAX_RATES, TaxRulesService } from "./tax-rules.service";

type SyncRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";

interface TrustedTaxSource {
  region: MarketRegion;
  label: string;
  url: string;
  taxType: string;
  taxName: string;
  categories: string[];
  parserHint: string;
  automationSupported: boolean;
  unsupportedReason?: string;
}

interface ExtractedTaxRule {
  category: string;
  taxType?: string;
  taxName?: string;
  rate: number;
  description?: string;
  evidenceQuote?: string;
  confidence?: number;
  effectiveFrom?: string | null;
  rationale?: string;
  stateCode?: string | null;
}

interface GeminiExtractionResult {
  summary?: string;
  rules: ExtractedTaxRule[];
}

interface NormalizedTaxRule {
  marketRegion: MarketRegion;
  category: string;
  taxType: string;
  taxName: string;
  rate: number;
  description: string | null;
  stateCode: string | null;
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const TRUSTED_TAX_SOURCES: TrustedTaxSource[] = [
  {
    region: "NP",
    label: "Inland Revenue Department Nepal",
    url: "https://ird.gov.np/",
    taxType: "LUXURY_TAX",
    taxName: "Luxury Tax / VAT",
    categories: ["PRECIOUS_METAL", "MAKING_CHARGE", "GEMSTONE", "FINISH"],
    parserHint:
      "Prefer Nepal IRD notices or finance-act text that explicitly states jewellery luxury tax and VAT treatment. Do not guess rates from summaries or blog posts.",
    automationSupported: true,
  },
  {
    region: "IN",
    label: "CBIC GST rate schedule",
    url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
    taxType: "GST",
    taxName: "GST",
    categories: ["PRECIOUS_METAL", "MAKING_CHARGE", "GEMSTONE"],
    parserHint:
      "For India jewellery billing, metal and gemstone value commonly map to 3% GST while making charges map to service GST. Do not emit FINISH unless the source explicitly covers finishing or plating services.",
    automationSupported: true,
  },
  {
    region: "AE",
    label: "UAE Federal Tax Authority",
    url: "https://tax.gov.ae/en/default.aspx",
    taxType: "VAT",
    taxName: "VAT",
    categories: ["ALL"],
    parserHint:
      "For UAE jewellery invoices, extract the standard VAT rate only when the source explicitly states it.",
    automationSupported: true,
  },
  {
    region: "UK",
    label: "GOV.UK VAT rates",
    url: "https://www.gov.uk/vat-rates",
    taxType: "VAT",
    taxName: "VAT",
    categories: ["ALL"],
    parserHint:
      "For UK jewellery invoices, extract the standard VAT rate only when the source explicitly states it.",
    automationSupported: true,
  },
  {
    region: "EU",
    label: "European Commission VAT guidance",
    url: "https://taxation-customs.ec.europa.eu/taxation/vat_en",
    taxType: "VAT",
    taxName: "VAT",
    categories: ["ALL"],
    parserHint:
      "EU VAT varies by member state. Treat the Orivraa EU region as advisory only and avoid proposing automatic changes.",
    automationSupported: false,
    unsupportedReason:
      "The EU region in Orivraa is an approximation. Rates vary by member state, so proposals should be reviewed country-by-country.",
  },
  {
    region: "US",
    label: "USA.gov sales tax guidance",
    url: "https://www.usa.gov/sales-tax",
    taxType: "SALES_TAX",
    taxName: "Sales Tax",
    categories: ["ALL"],
    parserHint:
      "US sales tax varies by state and local jurisdiction. Treat federal guidance as advisory only and avoid proposing automatic changes.",
    automationSupported: false,
    unsupportedReason:
      "US sales tax is state and locality specific, so a single automatic national rate would be misleading.",
  },
];

@Injectable()
export class TaxRuleSyncService {
  private readonly logger = new Logger(TaxRuleSyncService.name);
  private readonly apiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly taxRulesService: TaxRulesService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  private get taxSyncRunModel() {
    return (this.prisma as any).taxSyncRun;
  }

  private get taxRuleChangeProposalModel() {
    return (this.prisma as any).taxRuleChangeProposal;
  }

  private get taxRuleConfigModel() {
    return (this.prisma as any).taxRuleConfig;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduledSync(): Promise<void> {
    try {
      await this.executeSync({ triggerSource: "CRON" });
    } catch (error) {
      this.logger.error(`Scheduled tax sync failed: ${error}`);
    }
  }

  async listSources() {
    const latestRuns = await this.taxSyncRunModel.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        summary: true,
      },
    });

    const latestByRegion = new Map<
      MarketRegion,
      { runId: string; status: string; checkedAt: Date | null; message: string | null }
    >();

    for (const run of latestRuns) {
      const sourceResults = Array.isArray((run.summary as any)?.sourceResults)
        ? (run.summary as any).sourceResults
        : [];

      for (const result of sourceResults) {
        const region = result?.region as MarketRegion | undefined;
        if (!region || latestByRegion.has(region)) {
          continue;
        }

        latestByRegion.set(region, {
          runId: run.id,
          status: String(result?.status || run.status),
          checkedAt: result?.checkedAt ? new Date(result.checkedAt) : run.completedAt,
          message: result?.message ? String(result.message) : null,
        });
      }
    }

    return TRUSTED_TAX_SOURCES.map((source) => ({
      ...source,
      lastRun: latestByRegion.get(source.region) || null,
    }));
  }

  async listRuns(limit = 10) {
    return this.taxSyncRunModel.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  async listProposals(options?: {
    status?: string;
    region?: MarketRegion;
    limit?: number;
  }) {
    const where: Record<string, any> = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.region) {
      where.marketRegion = options.region;
    }

    return this.taxRuleChangeProposalModel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(options?.limit || 25, 1), 100),
    });
  }

  async runManualSync(triggeredBy?: string, region?: MarketRegion) {
    return this.executeSync({
      triggerSource: "MANUAL",
      triggeredBy,
      region,
    });
  }

  async approveProposal(id: string, reviewedBy?: string, reviewNotes?: string) {
    const proposal = await this.taxRuleChangeProposalModel.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new Error("Tax change proposal not found");
    }

    if (proposal.status !== "PENDING") {
      throw new Error(`Only pending proposals can be approved (current: ${proposal.status})`);
    }

    const existingRule = await this.taxRuleConfigModel.findFirst({
      where: {
        marketRegion: proposal.marketRegion,
        category: proposal.category,
        stateCode: proposal.stateCode || null,
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });

    const effectiveFrom = proposal.effectiveFrom || new Date();

    let appliedRuleId = existingRule?.id || null;

    if (existingRule) {
      const updated = await this.taxRuleConfigModel.update({
        where: { id: existingRule.id },
        data: {
          taxType: proposal.taxType,
          taxName: proposal.taxName,
          rate: proposal.proposedRate,
          description: proposal.proposedDescription || proposal.rationale || null,
          effectiveFrom,
          isActive: true,
        },
      });

      appliedRuleId = updated.id;
    } else {
      const created = await this.taxRuleConfigModel.create({
        data: {
          marketRegion: proposal.marketRegion,
          taxType: proposal.taxType,
          taxName: proposal.taxName,
          category: proposal.category,
          rate: proposal.proposedRate,
          isCompounding: false,
          priority: 0,
          stateCode: proposal.stateCode || null,
          description: proposal.proposedDescription || proposal.rationale || null,
          isActive: true,
          effectiveFrom,
          createdBy: reviewedBy || "tax-sync",
        },
      });

      appliedRuleId = created.id;
    }

    await this.taxRuleChangeProposalModel.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
        appliedRuleId,
      },
    });

    await this.taxRuleChangeProposalModel.updateMany({
      where: {
        id: { not: id },
        marketRegion: proposal.marketRegion,
        category: proposal.category,
        stateCode: proposal.stateCode || null,
        status: "PENDING",
      },
      data: {
        status: "SUPERSEDED",
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
        reviewNotes: "Superseded by a newer approved tax proposal.",
      },
    });

    this.taxRulesService.clearCache();

    return this.taxRuleChangeProposalModel.findUnique({ where: { id } });
  }

  async rejectProposal(id: string, reviewedBy?: string, reviewNotes?: string) {
    const proposal = await this.taxRuleChangeProposalModel.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new Error("Tax change proposal not found");
    }

    if (proposal.status !== "PENDING") {
      throw new Error(`Only pending proposals can be rejected (current: ${proposal.status})`);
    }

    return this.taxRuleChangeProposalModel.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedBy: reviewedBy || null,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
  }

  private async executeSync(options: {
    triggerSource: "MANUAL" | "CRON";
    triggeredBy?: string;
    region?: MarketRegion;
  }) {
    const sources = options.region
      ? TRUSTED_TAX_SOURCES.filter((source) => source.region === options.region)
      : TRUSTED_TAX_SOURCES;

    if (sources.length === 0) {
      throw new Error(`No trusted source configured for region ${options.region}`);
    }

    const run = await this.taxSyncRunModel.create({
      data: {
        triggerSource: options.triggerSource,
        status: "RUNNING",
        region: options.region || null,
        triggeredBy: options.triggeredBy || null,
        startedAt: new Date(),
      },
    });

    let proposalsCreated = 0;
    let skipped = 0;
    let failed = 0;
    const sourceResults: Array<Record<string, any>> = [];

    for (const source of sources) {
      if (!source.automationSupported) {
        skipped += 1;
        sourceResults.push({
          region: source.region,
          label: source.label,
          url: source.url,
          status: "SKIPPED",
          proposalsCreated: 0,
          checkedAt: new Date().toISOString(),
          message: source.unsupportedReason || "Automation disabled for this source.",
        });
        continue;
      }

      try {
        const pageText = await this.fetchSourceContent(source);
        const extraction = await this.extractRulesWithGemini(source, pageText);
        const createdForSource = await this.createProposalsForSource(
          run.id,
          source,
          extraction,
        );

        proposalsCreated += createdForSource;
        sourceResults.push({
          region: source.region,
          label: source.label,
          url: source.url,
          status: "COMPLETED",
          proposalsCreated: createdForSource,
          checkedAt: new Date().toISOString(),
          message:
            extraction.summary ||
            (createdForSource > 0
              ? `Created ${createdForSource} pending proposal(s).`
              : "No rate changes detected."),
        });
      } catch (error) {
        failed += 1;
        this.logger.warn(`Tax sync failed for ${source.region}: ${error}`);
        sourceResults.push({
          region: source.region,
          label: source.label,
          url: source.url,
          status: "FAILED",
          proposalsCreated: 0,
          checkedAt: new Date().toISOString(),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const finalStatus: SyncRunStatus =
      failed > 0 && failed === sources.length
        ? "FAILED"
        : failed > 0
          ? "PARTIAL"
          : "COMPLETED";

    return this.taxSyncRunModel.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        errorMessage:
          failed > 0 ? `${failed} trusted source check(s) failed.` : null,
        summary: {
          totalSources: sources.length,
          proposalsCreated,
          skipped,
          failed,
          sourceResults,
        },
      },
    });
  }

  private async fetchSourceContent(source: TrustedTaxSource): Promise<string> {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "OrivraaTaxSync/1.0 (+https://www.orivraa.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Trusted source fetch failed with status ${response.status}`);
    }

    const raw = await response.text();
    const normalized = this.normalizeSourceText(raw);

    if (normalized.length < 200) {
      throw new Error("Trusted source content was too short to extract tax evidence.");
    }

    return normalized.slice(0, 16000);
  }

  private async extractRulesWithGemini(
    source: TrustedTaxSource,
    pageText: string,
  ): Promise<GeminiExtractionResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const prompt = `You validate tax rules for Orivraa, a jewellery billing platform.

You are reading text copied from an official trusted source page.
Source label: ${source.label}
Region: ${source.region}
Allowed categories: ${source.categories.join(", ")}
Source guidance: ${source.parserHint}

Return a strict JSON object with this shape:
{
  "summary": "short factual summary",
  "rules": [
    {
      "category": "ALL | PRECIOUS_METAL | MAKING_CHARGE | GEMSTONE | FINISH",
      "taxType": "GST | VAT | SALES_TAX | LUXURY_TAX",
      "taxName": "GST | VAT | Sales Tax | Luxury Tax / VAT",
      "rate": 0.03,
      "description": "short tax description",
      "evidenceQuote": "exact short quote from the source text",
      "confidence": 0.91,
      "effectiveFrom": "YYYY-MM-DD or null",
      "rationale": "short explanation"
    }
  ]
}

Rules:
- Only include rates that are explicitly supported by the source text.
- If the source is ambiguous, return an empty rules array.
- Never guess or interpolate a rate.
- Never include categories outside the allowed list.
- For India, do not emit FINISH unless the text explicitly mentions finishing or plating services.
- Rates must be decimals, so 3% becomes 0.03 and 20% becomes 0.20.
- Use concise evidence quotes copied from the source text.
- Return JSON only, with no markdown fences.

Trusted source text:
${pageText}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini tax extraction failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini returned an empty tax extraction response.");
    }

    const parsed = this.parseJsonObject(rawText);
    const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];

    return {
      summary: typeof parsed?.summary === "string" ? parsed.summary : undefined,
      rules: rules
        .map((rule: Record<string, any>) =>
          this.normalizeExtractedRule(source, rule),
        )
        .filter((rule: ExtractedTaxRule | null): rule is ExtractedTaxRule =>
          Boolean(rule),
        ),
    };
  }

  private async createProposalsForSource(
    syncRunId: string,
    source: TrustedTaxSource,
    extraction: GeminiExtractionResult,
  ): Promise<number> {
    const currentRules = await this.getCurrentRules(source.region);
    let created = 0;

    for (const rule of extraction.rules) {
      const currentRule = this.findCurrentRule(
        currentRules,
        rule.category,
        rule.stateCode || undefined,
      );
      const currentRate = currentRule?.rate ?? null;

      if (currentRate !== null && Math.abs(currentRate - rule.rate) < 0.0001) {
        continue;
      }

      const dedupeKey = this.buildProposalDedupeKey(source.region, rule);
      const existing = await this.taxRuleChangeProposalModel.findUnique({
        where: { dedupeKey },
      });

      if (existing) {
        continue;
      }

      await this.taxRuleChangeProposalModel.create({
        data: {
          syncRunId,
          marketRegion: source.region,
          taxType: rule.taxType || source.taxType,
          taxName: rule.taxName || source.taxName,
          category: rule.category,
          stateCode: rule.stateCode || null,
          currentRate,
          proposedRate: rule.rate,
          changeDelta: currentRate === null ? null : rule.rate - currentRate,
          proposedDescription: rule.description || null,
          status: "PENDING",
          sourceLabel: source.label,
          sourceUrl: source.url,
          sourceExcerpt: rule.evidenceQuote || null,
          evidence: {
            summary: extraction.summary || null,
            evidenceQuote: rule.evidenceQuote || null,
            rationale: rule.rationale || null,
            rawSourceLabel: source.label,
          },
          confidence: rule.confidence ?? null,
          rationale: rule.rationale || extraction.summary || null,
          dedupeKey,
          effectiveFrom: rule.effectiveFrom ? new Date(rule.effectiveFrom) : null,
        },
      });

      created += 1;
    }

    return created;
  }

  private async getCurrentRules(region: MarketRegion): Promise<NormalizedTaxRule[]> {
    const dbRules =
      (await this.taxRuleConfigModel.findMany({
        where: {
          marketRegion: region,
          isActive: true,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      })) || [];

    if (dbRules.length > 0) {
      return dbRules.map((rule: any) => ({
        marketRegion: rule.marketRegion,
        category: rule.category,
        taxType: rule.taxType,
        taxName: rule.taxName,
        rate: rule.rate,
        description: rule.description || null,
        stateCode: rule.stateCode || null,
      }));
    }

    const defaults = DEFAULT_TAX_RATES[region];

    return Object.entries(defaults.rates).map(([category, rate]) => ({
      marketRegion: region,
      category,
      taxType: defaults.taxType,
      taxName: defaults.taxName,
      rate,
      description: null,
      stateCode: null,
    }));
  }

  private findCurrentRule(
    rules: NormalizedTaxRule[],
    category: string,
    stateCode?: string,
  ) {
    return (
      rules.find(
        (rule) =>
          rule.category === category &&
          ((stateCode && rule.stateCode === stateCode) || (!stateCode && !rule.stateCode)),
      ) ||
      rules.find((rule) => rule.category === category && !rule.stateCode) ||
      rules.find(
        (rule) =>
          rule.category === "ALL" &&
          ((stateCode && rule.stateCode === stateCode) || (!stateCode && !rule.stateCode)),
      ) ||
      rules.find((rule) => rule.category === "ALL" && !rule.stateCode) ||
      null
    );
  }

  private normalizeExtractedRule(
    source: TrustedTaxSource,
    rawRule: Record<string, any>,
  ): ExtractedTaxRule | null {
    const category = this.normalizeCategory(rawRule?.category);

    if (!category || !source.categories.includes(category)) {
      return null;
    }

    const rate = this.normalizeRate(rawRule?.rate);
    if (rate === null) {
      return null;
    }

    return {
      category,
      taxType: this.normalizeText(rawRule?.taxType) || source.taxType,
      taxName: this.normalizeText(rawRule?.taxName) || source.taxName,
      rate,
      description: this.normalizeText(rawRule?.description) || undefined,
      evidenceQuote: this.normalizeText(rawRule?.evidenceQuote) || undefined,
      confidence: this.normalizeConfidence(rawRule?.confidence),
      effectiveFrom: this.normalizeDate(rawRule?.effectiveFrom),
      rationale: this.normalizeText(rawRule?.rationale) || undefined,
      stateCode: this.normalizeText(rawRule?.stateCode) || undefined,
    };
  }

  private normalizeCategory(category: unknown): string | null {
    const value = this.normalizeText(category)?.toUpperCase().replace(/\s+/g, "_");

    if (!value) {
      return null;
    }

    const normalizedMap: Record<string, string> = {
      ALL: "ALL",
      PRECIOUS_METAL: "PRECIOUS_METAL",
      METAL: "PRECIOUS_METAL",
      GOLD: "PRECIOUS_METAL",
      GEMSTONE: "GEMSTONE",
      GEMSTONES: "GEMSTONE",
      DIAMOND: "GEMSTONE",
      MAKING: "MAKING_CHARGE",
      MAKING_CHARGE: "MAKING_CHARGE",
      MAKING_CHARGES: "MAKING_CHARGE",
      FINISH: "FINISH",
      PLATING: "FINISH",
      FINISHING: "FINISH",
    };

    return normalizedMap[value] || null;
  }

  private normalizeRate(rawRate: unknown): number | null {
    const rate = Number(rawRate);

    if (!Number.isFinite(rate) || rate < 0) {
      return null;
    }

    if (rate > 1 && rate <= 100) {
      return Math.round((rate / 100) * 10000) / 10000;
    }

    if (rate <= 1) {
      return Math.round(rate * 10000) / 10000;
    }

    return null;
  }

  private normalizeConfidence(rawConfidence: unknown): number | undefined {
    const confidence = Number(rawConfidence);

    if (!Number.isFinite(confidence) || confidence < 0) {
      return undefined;
    }

    if (confidence > 1 && confidence <= 100) {
      return Math.round((confidence / 100) * 100) / 100;
    }

    return Math.min(Math.round(confidence * 100) / 100, 1);
  }

  private normalizeDate(rawDate: unknown): string | null {
    const value = this.normalizeText(rawDate);

    if (!value) {
      return null;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  private normalizeText(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private buildProposalDedupeKey(
    region: MarketRegion,
    rule: ExtractedTaxRule,
  ): string {
    const stableInput = [
      region,
      rule.category,
      rule.stateCode || "",
      rule.rate.toFixed(4),
      (rule.evidenceQuote || "").slice(0, 160),
    ].join("|");

    return createHash("sha256").update(stableInput).digest("hex");
  }

  private normalizeSourceText(raw: string): string {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/section|\/article|\/h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private parseJsonObject(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      }

      throw new Error("Unable to parse Gemini JSON response.");
    }
  }
}