import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  enhancementCreditCost,
  resolveEnhancementModel,
  type AiEnhancementModelId,
} from "@gold-shop/shared";
import { randomUUID } from "crypto";
import { AiCreditsService } from "../core/ai-credits/ai-credits.service";
import { ImageWorkerUploadService } from "../media/image-worker-upload.service";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = /^image\/(?:jpe?g|png|webp|gif|avif)$/i;

type SourceImage = {
  url: string;
  mimeType: string;
  base64: string;
};

export type ImageEnhancementResult = {
  sourceUrl: string;
  status: "success" | "failed";
  enhancedUrl?: string;
  error?: string;
};

@Injectable()
export class ImageEnhancementService {
  private readonly logger = new Logger(ImageEnhancementService.name);
  private readonly apiKey: string;

  constructor(
    configService: ConfigService,
    private readonly aiCredits: AiCreditsService,
    private readonly imageUpload: ImageWorkerUploadService,
  ) {
    this.apiKey = configService.get<string>("GEMINI_API_KEY") || "";
  }

  async enhance(opts: {
    userId: string;
    shopId: string;
    imageUrls: string[];
    referenceImageUrls?: string[];
    model?: AiEnhancementModelId;
    context?: {
      name?: string;
      jewelleryType?: string;
      metal?: string;
      purity?: string;
    };
  }) {
    if (!this.apiKey) {
      throw new BadRequestException("AI image enhancement is not configured");
    }

    const targets = opts.imageUrls.map((url) => this.validateProductImageUrl(url));
    const references = (opts.referenceImageUrls || []).map((url) =>
      this.validateProductImageUrl(url),
    );
    const model = resolveEnhancementModel(opts.model);
    const totalCost = enhancementCreditCost(model, targets.length);
    const debitKey = `img_enh:${opts.userId}:${randomUUID()}`;
    const debit = await this.aiCredits.debitForShopkeeperGeneration({
      userId: opts.userId,
      shopId: opts.shopId,
      amount: totalCost,
      reason: `product_image_enhancement:${model.id}`,
      referenceId: debitKey,
      idempotencyKey: debitKey,
    });

    const sourceCache = new Map<string, Promise<SourceImage>>();
    const getSource = (url: string) => {
      let pending = sourceCache.get(url);
      if (!pending) {
        pending = this.fetchSourceImage(url);
        sourceCache.set(url, pending);
      }
      return pending;
    };

    const results: ImageEnhancementResult[] = [];
    let creditsRefunded = 0;
    let balanceAfter = debit.skipped ? undefined : debit.balanceAfter;

    for (let index = 0; index < targets.length; index++) {
      const targetUrl = targets[index];
      try {
        const target = await getSource(targetUrl);
        const siblingUrls = [...references, ...targets.filter((url) => url !== targetUrl)];
        const uniqueSiblingUrls = [...new Set(siblingUrls)]
          .filter((url) => url !== targetUrl)
          .slice(0, model.maxReferenceImages);
        const siblingResults = await Promise.allSettled(
          uniqueSiblingUrls.map((url) => getSource(url)),
        );
        const siblingImages = siblingResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        const output = await this.callGemini({
          apiModelId: model.apiModelId,
          premium: model.id === "nano-banana-pro",
          target,
          references: siblingImages,
          context: opts.context,
        });
        const enhancedUrl = await this.imageUpload.uploadDataUrl({
          dataUrl: output,
          uploadType: "product",
          filenamePrefix: `enhanced-${randomUUID()}`,
          subject: `system:image-enhancement:${opts.userId}`,
          shopId: opts.shopId,
        });
        results.push({ sourceUrl: targetUrl, status: "success", enhancedUrl });
      } catch (error) {
        this.logger.warn(
          `Enhancement failed for target ${index + 1}: ${(error as Error).message}`,
        );
        if (!debit.skipped) {
          const refund = await this.aiCredits.refundCredits({
            userId: opts.userId,
            shopId: opts.shopId,
            amount: model.creditsPerImage,
            reason: `product_image_enhancement_failed:${model.id}`,
            referenceId: debitKey,
            idempotencyKey: `refund:${debitKey}:${index}`,
          });
          balanceAfter = refund.balanceAfter;
          creditsRefunded += model.creditsPerImage;
        }
        results.push({
          sourceUrl: targetUrl,
          status: "failed",
          error: "Could not enhance this photo. Try again.",
        });
      }
    }

    return {
      model: model.id,
      creditsCharged: debit.skipped ? 0 : totalCost,
      creditsRefunded,
      balanceAfter,
      results,
    };
  }

  private validateProductImageUrl(value: string): string {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException("Product image URL is invalid");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port !== "" ||
      url.hostname !== "images.orivraa.com" ||
      !/^\/product\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|gif|avif)$/i.test(
        url.pathname,
      )
    ) {
      throw new BadRequestException(
        "Only uploaded Orivraa product images can be enhanced",
      );
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  private async fetchSourceImage(url: string): Promise<SourceImage> {
    const source = new URL(url);
    const productKey = source.pathname.match(
      /^\/product\/([A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|gif|avif))$/i,
    )?.[1];
    if (
      source.protocol !== "https:" ||
      source.username ||
      source.password ||
      source.port !== "" ||
      source.hostname !== "images.orivraa.com" ||
      !productKey
    ) {
      throw new Error("Source image URL is not an allowed Orivraa product image");
    }
    const safeUrl = new URL("https://images.orivraa.com/product/");
    safeUrl.pathname += encodeURIComponent(productKey);
    const response = await fetch(safeUrl, { redirect: "error" });
    if (!response.ok) throw new Error(`Source image fetch failed (${response.status})`);
    const mimeType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_MIME.test(mimeType)) {
      throw new Error("Source URL did not return a supported image");
    }
    const declaredBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_SOURCE_BYTES) {
      throw new Error("Source image is too large");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || bytes.length > MAX_SOURCE_BYTES) {
      throw new Error("Source image size is outside the allowed range");
    }
    return { url, mimeType, base64: bytes.toString("base64") };
  }

  private async callGemini(opts: {
    apiModelId: string;
    premium: boolean;
    target: SourceImage;
    references: SourceImage[];
    context?: {
      name?: string;
      jewelleryType?: string;
      metal?: string;
      purity?: string;
    };
  }): Promise<string> {
    const context = [
      opts.context?.name,
      opts.context?.jewelleryType,
      opts.context?.metal,
      opts.context?.purity,
    ]
      .filter(Boolean)
      .join(", ");
    const prompt = [
      "Edit the first image into a premium jewellery product photograph.",
      "Preserve the exact piece: design, silhouette, proportions, metal color, hallmark, gemstones, stone count, settings, engravings, texture, and every physical detail must remain unchanged.",
      "Only improve exposure, white balance, sharpness, dust cleanup, studio lighting, a clean neutral-white background, and a natural soft contact shadow.",
      "Do not add, remove, reshape, restyle, recolor, rotate, crop out, or invent any part of the jewellery. Do not add text, props, hands, models, packaging, logos, or watermarks.",
      opts.references.length
        ? "The later images show the same product from other angles. Use them only to understand the piece; output an enhanced version of the first image."
        : "The first image is the only product reference.",
      context ? `Catalog context: ${context}.` : "",
      "Return one edited product image.",
    ]
      .filter(Boolean)
      .join("\n");
    const parts: Array<Record<string, unknown>> = [
      { text: prompt },
      {
        inlineData: {
          mimeType: opts.target.mimeType,
          data: opts.target.base64,
        },
      },
      ...opts.references.map((image) => ({
        inlineData: { mimeType: image.mimeType, data: image.base64 },
      })),
    ];
    const generationConfig: Record<string, unknown> = {
      responseModalities: ["TEXT", "IMAGE"],
    };
    if (opts.premium) {
      generationConfig.imageConfig = { aspectRatio: "1:1", imageSize: "2K" };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${opts.apiModelId}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig,
        }),
      },
    );
    if (!response.ok) {
      const providerMessage = await response.text();
      throw new Error(
        `Gemini enhancement failed (${response.status}): ${providerMessage.slice(0, 200)}`,
      );
    }
    const data = (await response.json()) as Record<string, any>;
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`Gemini safety block: ${blockReason}`);
    const candidate = data?.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Gemini safety block");
    }
    const imagePart = candidate?.content?.parts?.find(
      (part: Record<string, any>) => part.inlineData?.data || part.inline_data?.data,
    );
    const inlineData = imagePart?.inlineData || imagePart?.inline_data;
    const base64 = inlineData?.data;
    if (typeof base64 !== "string" || base64.length < 1_000) {
      throw new Error("Gemini returned no enhanced image");
    }
    const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
    if (!/^image\/(?:png|jpe?g|webp)$/i.test(mimeType)) {
      throw new Error("Gemini returned an unsupported image format");
    }
    return `data:${mimeType};base64,${base64}`;
  }
}
