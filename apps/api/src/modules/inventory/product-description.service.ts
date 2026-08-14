import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import {
  AI_CREDIT_COSTS,
  missingProductDescriptionLabels,
  productDescriptionSpecsReady,
  type ProductDescriptionSpecs,
} from "@gold-shop/shared";
import { AiCreditsService } from "../core/ai-credits/ai-credits.service";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

@Injectable()
export class ProductDescriptionService {
  private readonly logger = new Logger(ProductDescriptionService.name);

  constructor(
    private readonly credits: AiCreditsService,
    private readonly config: ConfigService,
  ) {}

  async generateAiDescription(opts: {
    userId: string;
    shopId: string;
    specs: ProductDescriptionSpecs;
    idempotencyKey?: string;
  }): Promise<{ description: string; source: "AI"; balanceAfter: number }> {
    if (!productDescriptionSpecsReady(opts.specs)) {
      const missing = missingProductDescriptionLabels(opts.specs).join(", ");
      throw new BadRequestException(
        `Fill ${missing} before generating a description`,
      );
    }

    const idempotencyKey =
      opts.idempotencyKey || `product-desc:${opts.userId}:${randomUUID()}`;
    const debit = await this.credits.debitForShopkeeperGeneration({
      userId: opts.userId,
      shopId: opts.shopId,
      amount: AI_CREDIT_COSTS.PRODUCT_DESCRIPTION,
      reason: "product_description",
      idempotencyKey,
    });

    if (debit.skipped) {
      throw new BadRequestException(
        "AI product descriptions are only available on shopkeeper accounts",
      );
    }

    try {
      const description = await this.generateWithGemini(opts.specs);
      if (!description) {
        throw new Error("empty_gemini_response");
      }
      return {
        description,
        source: "AI",
        balanceAfter: debit.balanceAfter,
      };
    } catch (error) {
      await this.credits
        .refundCredits({
          userId: opts.userId,
          shopId: opts.shopId,
          amount: AI_CREDIT_COSTS.PRODUCT_DESCRIPTION,
          reason: "product_description_failed",
          idempotencyKey: `refund:${idempotencyKey}`,
        })
        .catch((refundErr) =>
          this.logger.error(
            `Failed to refund product-description credits: ${refundErr.message}`,
          ),
        );
      this.logger.warn(
        `AI product description failed: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        "Could not generate an AI description. Your credits were refunded. Try the template instead.",
      );
    }
  }

  private async generateWithGemini(
    specs: ProductDescriptionSpecs,
  ): Promise<string | null> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY") || "";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const gemLine = (specs.gemstones || [])
      .filter((g) => g.type)
      .map((g) =>
        [g.caratWeight ? `${g.caratWeight}ct` : "", g.cut, g.type]
          .filter(Boolean)
          .join(" "),
      )
      .join(", ");

    const prompt = `Write one elegant jewellery catalogue description in 1-2 sentences (max 280 characters).

Jewellery type: ${specs.jewelleryType}
Metal: ${specs.purity || ""} ${specs.metalType}
Weight grams: ${specs.weightGrams}
${gemLine ? `Gemstones: ${gemLine}` : "Gemstones: none"}

Requirements:
- Sound like a jeweller writing for a customer, not an ad agency
- Mention the metal, piece type, and weight naturally
- Include gemstones only if listed
- No bullet points, no quotes, no labels, no hashtags
- Just the description text`;

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 180,
          topP: 0.9,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const generated = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generated?.trim()) {
      return null;
    }
    return this.cleanGeneratedText(generated);
  }

  private cleanGeneratedText(text: string): string {
    let cleaned = text.trim();
    cleaned = cleaned
      .replace(
        /^(Description:|Here is|Here's|This is|Product Description:)\s*/i,
        "",
      )
      .trim();
    cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    if (cleaned && !/[.!?]$/.test(cleaned)) {
      cleaned += ".";
    }
    if (cleaned.length > 320) {
      cleaned = `${cleaned.slice(0, 317)}...`;
    }
    return cleaned;
  }
}
