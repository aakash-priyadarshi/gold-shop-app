import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { RedisService } from "../../common/redis";
import { LOCALE_NAMES, type SupportedLocale } from "./dto/translate.dto";

/* ────────────────────────────────────────────────────────────── */
/*  Simple HTML text-node extractor (no DOM dependency)           */
/* ────────────────────────────────────────────────────────────── */

interface HtmlSegment {
  /** "tag" = HTML markup, "text" = translatable content */
  type: "tag" | "text";
  value: string;
}

export interface TranslationBatchResult {
  translations: string[];
  translated: boolean[];
}

export interface HtmlTranslationResult {
  html: string;
  contentHash: string;
  fromCache: boolean;
  translated: boolean;
}

/**
 * Split HTML into alternating tag / text segments.
 * Tags, entities, and whitespace-only nodes are preserved as-is.
 * Only non-empty text nodes are marked for translation.
 */
function segmentHtml(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];
  // Match HTML tags (including comments, doctype, self-closing)
  const TAG_RE = /<[^>]+>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(html)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      const text = html.slice(lastIndex, match.index);
      segments.push({
        type: text.trim().length > 0 ? "text" : "tag", // whitespace-only → tag (don't translate)
        value: text,
      });
    }
    // The tag itself
    segments.push({ type: "tag", value: match[0] });
    lastIndex = TAG_RE.lastIndex;
  }

  // Remaining text after last tag
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    segments.push({
      type: text.trim().length > 0 ? "text" : "tag",
      value: text,
    });
  }

  return segments;
}

/**
 * AI Translation Service
 *
 * Uses Google Gemini 2.0 Flash to translate UI text on demand.
 * Translations are cached permanently in Redis — Gemini is only called once
 * per unique string per locale.
 *
 * Cost: Effectively $0 after initial translation pass (cached forever).
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = "i18n:";
  private readonly memoryCache = new Map<string, string>();

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /**
   * Translate a batch of English texts to the target locale.
   * Returns translations in the same order as input.
   */
  async translateBatch(
    texts: string[],
    locale: SupportedLocale,
  ): Promise<TranslationBatchResult> {
    if (locale === "en") {
      return {
        translations: texts,
        translated: texts.map(() => true),
      };
    }
    if (texts.length === 0) {
      return { translations: [], translated: [] };
    }

    // 1. Check cache for each text
    const results: (string | null)[] = await Promise.all(
      texts.map((text) => this.getFromCache(locale, text)),
    );
    const translated = results.map((value) => value !== null);

    // 2. Collect uncached texts
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      if (results[i] === null) {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length === 0) {
      this.logger.debug(
        `All ${texts.length} texts cached for locale=${locale}`,
      );
      return {
        translations: results as string[],
        translated,
      };
    }

    this.logger.log(
      `Translating ${uncachedTexts.length}/${texts.length} uncached texts to ${locale}`,
    );

    // 3. Translate uncached texts via Gemini (in chunks of 30)
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uncachedTexts.length; i += CHUNK_SIZE) {
      const chunk = uncachedTexts.slice(i, i + CHUNK_SIZE);
      const chunkIndices = uncachedIndices.slice(i, i + CHUNK_SIZE);

      try {
        const translations = await this.callGemini(chunk, locale);

        // Cache and fill results
        for (let j = 0; j < chunk.length; j++) {
          const translation =
            translations[j] !== undefined ? translations[j] : chunk[j];
          results[chunkIndices[j]] = translation;
          translated[chunkIndices[j]] = true;
          // Cache permanently (no TTL)
          this.setInCache(locale, chunk[j], translation).catch(() => {});
        }
      } catch (error) {
        this.logger.error(`Gemini translation failed: ${error.message}`);
        // Fallback: return original English text for failed items
        for (let j = 0; j < chunk.length; j++) {
          if (results[chunkIndices[j]] === null) {
            results[chunkIndices[j]] = chunk[j];
            translated[chunkIndices[j]] = false;
          }
        }
      }
    }

    return {
      translations: results as string[],
      translated,
    };
  }

  private async callGemini(
    texts: string[],
    locale: SupportedLocale,
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const langName = LOCALE_NAMES[locale];
    const numbered = texts
      .map((t, i) => `[${i}] ${JSON.stringify(t)}`)
      .join("\n");

    const prompt = `You are a professional translator for a jewellery marketplace called "Orivraa".
Translate the following UI texts from English to ${langName}.

Rules:
- Return ONLY a JSON array of strings in the same order.
- Keep brand names like "Orivraa" unchanged.
- Keep HTML tags (<strong>, <a>, etc.) intact if present.
- Keep numbers, currency symbols, and emoji unchanged.
- Use natural, fluent ${langName} — not machine-sounding translation.
- For ${locale === "ar" ? "Arabic, use Modern Standard Arabic (فصحى)" : `${langName}, use the most common standard dialect`}.

Texts:
${numbered}

Respond with ONLY the JSON array, no markdown fences.`;

    const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length !== texts.length) {
      throw new Error(
        `Invalid response shape: expected array of ${texts.length}, got ${parsed?.length}`,
      );
    }

    return parsed;
  }

  private cacheKey(locale: string, text: string): string {
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    return `${this.CACHE_PREFIX}${locale}:${hash}`;
  }

  private async getFromCache(
    locale: string,
    text: string,
  ): Promise<string | null> {
    const key = this.cacheKey(locale, text);
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue) return memoryValue;

    const redisValue = await this.redisService.get(key);
    if (redisValue) this.memoryCache.set(key, redisValue);
    return redisValue;
  }

  private async setInCache(
    locale: string,
    text: string,
    translation: string,
  ): Promise<void> {
    const key = this.cacheKey(locale, text);
    this.memoryCache.set(key, translation);
    // No TTL = permanent cache
    await this.redisService.set(key, translation);
  }

  /* ────────────────────────────────────────────────────────── */
  /*  HTML Content Translation                                  */
  /* ────────────────────────────────────────────────────────── */

  private htmlCacheKey(locale: string, contentHash: string): string {
    return `${this.CACHE_PREFIX}html:${locale}:${contentHash}`;
  }

  private hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 20);
  }

  private isSuspiciousHtmlFallback(source: string, translated: string): boolean {
    if (source.trim() !== translated.trim()) {
      return false;
    }

    const textOnly = source.replace(/<[^>]+>/g, " ");
    return /[A-Za-z]/.test(textOnly);
  }

  /**
   * Translate a full HTML document/fragment.
   *
   * Strategy:
   * 1. Hash the HTML content → check if we already have a fully-translated
   *    version cached for this locale. If yes, return immediately ($0 cost).
   * 2. On cache miss, parse HTML into text segments.
   * 3. Each text segment is individually cached (same cache as translateBatch).
   *    So if the admin edits one paragraph, only that paragraph costs an AI call.
   * 4. Reassemble and cache the full translated HTML for fast future lookups.
   *
   * Returns: { html, contentHash, fromCache }
   */
  async translateHtml(
    html: string,
    locale: SupportedLocale,
  ): Promise<HtmlTranslationResult> {
    if (locale === "en" || !html) {
      return {
        html,
        contentHash: this.hashContent(html || ""),
        fromCache: true,
        translated: true,
      };
    }

    const contentHash = this.hashContent(html);

    // 1. Check full-document cache
    const cached = await this.redisService.get(
      this.htmlCacheKey(locale, contentHash),
    );
    if (cached && !this.isSuspiciousHtmlFallback(html, cached)) {
      this.logger.debug(
        `HTML translation cache hit: locale=${locale} hash=${contentHash}`,
      );
      return {
        html: cached,
        contentHash,
        fromCache: true,
        translated: true,
      };
    }
    if (cached) {
      this.logger.warn(
        `Ignoring poisoned HTML translation cache for locale=${locale} hash=${contentHash}`,
      );
    }

    // 2. Parse into segments
    const segments = segmentHtml(html);
    const textSegments: { index: number; value: string }[] = [];
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].type === "text") {
        textSegments.push({ index: i, value: segments[i].value });
      }
    }

    if (textSegments.length === 0) {
      // No translatable text (e.g. only tags/images)
      return { html, contentHash, fromCache: false, translated: true };
    }

    // 3. Check per-segment cache; collect uncached
    const segmentResults: (string | null)[] = await Promise.all(
      textSegments.map((s) => this.getFromCache(locale, s.value.trim())),
    );
    const segmentTranslated = segmentResults.map((value) => value !== null);

    const uncachedIdx: number[] = [];
    const uncachedTexts: string[] = [];
    for (let i = 0; i < textSegments.length; i++) {
      if (segmentResults[i] === null) {
        uncachedIdx.push(i);
        uncachedTexts.push(textSegments[i].value.trim());
      }
    }

    this.logger.log(
      `HTML translation: ${textSegments.length} segments, ${uncachedTexts.length} uncached → locale=${locale}`,
    );

    // 4. Translate uncached via Gemini in chunks
    if (uncachedTexts.length > 0) {
      const CHUNK_SIZE = 30;
      for (let i = 0; i < uncachedTexts.length; i += CHUNK_SIZE) {
        const chunk = uncachedTexts.slice(i, i + CHUNK_SIZE);
        const chunkLocalIdx = uncachedIdx.slice(i, i + CHUNK_SIZE);

        try {
          const translations = await this.callGemini(chunk, locale);
          for (let j = 0; j < chunk.length; j++) {
            const translation =
              translations[j] !== undefined ? translations[j] : chunk[j];
            segmentResults[chunkLocalIdx[j]] = translation;
            segmentTranslated[chunkLocalIdx[j]] = true;
            this.setInCache(locale, chunk[j], translation).catch(() => {});
          }
        } catch (error) {
          this.logger.error(
            `Gemini HTML translation failed: ${error.message}`,
          );
          for (let j = 0; j < chunk.length; j++) {
            if (segmentResults[chunkLocalIdx[j]] === null) {
              segmentResults[chunkLocalIdx[j]] = chunk[j];
              segmentTranslated[chunkLocalIdx[j]] = false;
            }
          }
        }
      }
    }

    // 5. Reassemble: replace text segments with translations
    for (let i = 0; i < textSegments.length; i++) {
      const seg = textSegments[i];
      const original = seg.value;
      const translated = segmentResults[i] || original;
      // Preserve leading/trailing whitespace from the original segment
      const leadingWs = original.match(/^\s*/)?.[0] || "";
      const trailingWs = original.match(/\s*$/)?.[0] || "";
      segments[seg.index].value = leadingWs + translated + trailingWs;
    }

    const translatedHtml = segments.map((s) => s.value).join("");
    const translated = segmentTranslated.every(Boolean);

    // 6. Cache the full assembled document (keyed by content hash)
    if (translated) {
      this.redisService
        .set(this.htmlCacheKey(locale, contentHash), translatedHtml)
        .catch(() => {});
    }

    return {
      html: translatedHtml,
      contentHash,
      fromCache: false,
      translated,
    };
  }
}
