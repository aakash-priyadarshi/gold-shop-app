import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { RedisService } from "../../common/redis";
import { PrismaService } from "../../prisma/prisma.service";
import { LOCALE_NAMES, type SupportedLocale } from "./dto/translate.dto";

/* ────────────────────────────────────────────────────────────── */
/*  Bounded LRU memory cache (L1)                                 */
/* ────────────────────────────────────────────────────────────── */

/**
 * Tiny LRU cache backed by Map's insertion-order semantics.
 * Bounded so a long-running process can't accumulate unbounded memory.
 */
class LruCache<V> {
  private readonly map = new Map<string, V>();
  constructor(private readonly maxSize: number) {}

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // Touch: re-insert to mark as most recently used
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.maxSize) {
      // Evict oldest (first inserted)
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}

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
  private readonly MODEL_NAME = "gemini-2.0-flash";
  private readonly apiKey: string;
  private readonly CACHE_PREFIX = "i18n:";
  /** L1: in-process LRU. Bounded to prevent memory growth at scale. */
  private readonly memoryCache = new LruCache<string>(20_000);

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Hashing                                                   */
  /* ────────────────────────────────────────────────────────── */

  /** 32-char source-text hash used as DB key (collision-resistant). */
  private sourceHash(text: string): string {
    return createHash("sha256").update(text).digest("hex").slice(0, 32);
  }

  /* ────────────────────────────────────────────────────────── */
  /*  Tier 3 — Postgres lookup / persistence                    */
  /* ────────────────────────────────────────────────────────── */

  /**
   * Bulk-load translations from the DB. Returns Map<sourceText, translation>.
   * Uses a single indexed query on (locale, sourceHash IN [...]).
   */
  private async getFromDb(
    locale: string,
    texts: string[],
  ): Promise<Map<string, string>> {
    if (texts.length === 0) return new Map();
    const hashToText = new Map<string, string>();
    for (const text of texts) hashToText.set(this.sourceHash(text), text);

    try {
      const rows = await this.prisma.translation.findMany({
        where: { locale, sourceHash: { in: Array.from(hashToText.keys()) } },
        select: { sourceHash: true, translation: true },
      });
      const result = new Map<string, string>();
      for (const row of rows) {
        const text = hashToText.get(row.sourceHash);
        if (text !== undefined) result.set(text, row.translation);
      }
      return result;
    } catch (err) {
      this.logger.warn(
        `DB translation lookup failed (continuing): ${(err as Error).message}`,
      );
      return new Map();
    }
  }

  /**
   * Persist Gemini translations to the DB. Uses createMany with skipDuplicates
   * so concurrent writers don't conflict. Fire-and-forget from caller.
   */
  private async saveToDb(
    locale: string,
    items: Array<{ sourceText: string; translation: string }>,
  ): Promise<void> {
    if (items.length === 0) return;
    try {
      await this.prisma.translation.createMany({
        data: items.map((it) => ({
          locale,
          sourceHash: this.sourceHash(it.sourceText),
          sourceText: it.sourceText,
          translation: it.translation,
          model: this.MODEL_NAME,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.warn(
        `DB translation save failed (non-fatal): ${(err as Error).message}`,
      );
    }
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

    // 1. Check L1 + L2 cache (auto-invalidates stale English fallbacks)
    const results: (string | null)[] = await Promise.all(
      texts.map((text) => this.getValidatedFromCache(locale, text)),
    );
    const translated = results.map((value) => value !== null);

    // 2. Collect uncached texts after L1/L2 miss
    let uncachedIndices: number[] = [];
    let uncachedTexts: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      if (results[i] === null) {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    // 2b. Tier 3: bulk DB lookup for anything still missing
    if (uncachedTexts.length > 0) {
      const dbHits = await this.getFromDb(locale, uncachedTexts);
      if (dbHits.size > 0) {
        const stillMissingIdx: number[] = [];
        const stillMissingTxt: string[] = [];
        for (let k = 0; k < uncachedTexts.length; k++) {
          const text = uncachedTexts[k];
          const hit = dbHits.get(text);
          const origIdx = uncachedIndices[k];
          if (hit && !this.isSuspiciousTranslation(text, hit)) {
            results[origIdx] = hit;
            translated[origIdx] = true;
            // Promote to L2 + L1 for next time
            this.setInCache(locale, text, hit).catch(() => {});
          } else {
            stillMissingIdx.push(origIdx);
            stillMissingTxt.push(text);
          }
        }
        this.logger.log(
          `DB hit for ${dbHits.size}/${uncachedTexts.length} texts (locale=${locale}); ${stillMissingTxt.length} still need Gemini`,
        );
        uncachedIndices = stillMissingIdx;
        uncachedTexts = stillMissingTxt;
      }
    }

    if (uncachedTexts.length === 0) {
      this.logger.debug(
        `All ${texts.length} texts served from cache/DB for locale=${locale}`,
      );
      return {
        translations: results as string[],
        translated,
      };
    }

    this.logger.log(
      `Translating ${uncachedTexts.length}/${texts.length} via Gemini \u2192 ${locale}`,
    );

    // 3. Translate uncached texts via Gemini (in chunks of 30)
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uncachedTexts.length; i += CHUNK_SIZE) {
      const chunk = uncachedTexts.slice(i, i + CHUNK_SIZE);
      const chunkIndices = uncachedIndices.slice(i, i + CHUNK_SIZE);

      try {
        const translations = await this.callGemini(chunk, locale);

        // Accumulate validated translations for bulk DB write
        const toPersist: Array<{ sourceText: string; translation: string }> = [];

        for (let j = 0; j < chunk.length; j++) {
          const translation =
            translations[j] !== undefined ? translations[j] : chunk[j];
          const isActualTranslation = !this.isSuspiciousTranslation(
            chunk[j],
            translation,
          );
          results[chunkIndices[j]] = translation;
          translated[chunkIndices[j]] = isActualTranslation;
          // Only cache + persist if Gemini actually translated it
          if (isActualTranslation) {
            this.setInCache(locale, chunk[j], translation).catch(() => {});
            toPersist.push({ sourceText: chunk[j], translation });
          } else {
            this.logger.warn(
              `Suspicious fallback for locale=${locale}: "${chunk[j]}" \u2014 not caching`,
            );
          }
        }

        // Fire-and-forget DB persist (durable Tier 3)
        this.saveToDb(locale, toPersist).catch(() => {});
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

  /**
   * Returns true when a translation looks like an untranslated English fallback.
   * Specifically: source and translated are identical, the text contains Latin
   * characters, and the text is either multi-word (has whitespace) or longer
   * than 24 characters (short single words may legitimately be the same in
   * both languages, e.g. brand names, "OK", numbers).
   */
  private isSuspiciousTranslation(source: string, translation: string): boolean {
    const s = source.trim();
    const t = translation.trim();
    if (!s || s !== t) return false;
    if (!/[A-Za-z]/.test(s)) return false;
    return /\s/.test(s) || s.length > 24;
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

  /**
   * Like getFromCache but auto-invalidates stale English fallbacks.
   * If a cached value looks like it was never actually translated
   * (source === cached for multi-word / long strings), the stale entry
   * is deleted from both Redis and the in-memory cache so that the next
   * request will call Gemini again.
   */
  private async getValidatedFromCache(
    locale: string,
    text: string,
  ): Promise<string | null> {
    const cached = await this.getFromCache(locale, text);
    if (cached === null) return null;

    if (this.isSuspiciousTranslation(text, cached)) {
      // Stale English fallback in cache — evict it
      const key = this.cacheKey(locale, text);
      this.memoryCache.delete(key);
      this.redisService.del(key).catch(() => {});
      this.logger.warn(
        `Evicted stale fallback from cache for locale=${locale}: "${text}"`,
      );
      return null;
    }

    return cached;
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
    const htmlRedisKey = this.htmlCacheKey(locale, contentHash);

    // 1a. Check Redis full-document cache (Tier 2)
    const cached = await this.redisService.get(htmlRedisKey);
    if (cached && !this.isSuspiciousHtmlFallback(html, cached)) {
      this.logger.debug(
        `HTML cache hit (Redis): locale=${locale} hash=${contentHash}`,
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
        `Ignoring poisoned HTML Redis cache for locale=${locale} hash=${contentHash}`,
      );
      this.redisService.del(htmlRedisKey).catch(() => {});
    }

    // 1b. Check Postgres full-document cache (Tier 3)
    try {
      const dbHtml = await this.prisma.htmlTranslation.findUnique({
        where: { locale_contentHash: { locale, contentHash } },
        select: { html: true },
      });
      if (dbHtml && !this.isSuspiciousHtmlFallback(html, dbHtml.html)) {
        this.logger.debug(
          `HTML cache hit (DB): locale=${locale} hash=${contentHash} — promoting to Redis`,
        );
        // Promote to Redis for next time
        this.redisService.set(htmlRedisKey, dbHtml.html).catch(() => {});
        return {
          html: dbHtml.html,
          contentHash,
          fromCache: true,
          translated: true,
        };
      }
    } catch (err) {
      this.logger.warn(
        `DB HTML lookup failed (continuing): ${(err as Error).message}`,
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

    // 3. Check per-segment L1+L2 cache; collect uncached
    const segmentResults: (string | null)[] = await Promise.all(
      textSegments.map((s) => this.getValidatedFromCache(locale, s.value.trim())),
    );
    const segmentTranslated = segmentResults.map((value) => value !== null);

    let uncachedIdx: number[] = [];
    let uncachedTexts: string[] = [];
    for (let i = 0; i < textSegments.length; i++) {
      if (segmentResults[i] === null) {
        uncachedIdx.push(i);
        uncachedTexts.push(textSegments[i].value.trim());
      }
    }

    // 3b. Tier 3: bulk DB lookup for missing segments
    if (uncachedTexts.length > 0) {
      const dbHits = await this.getFromDb(locale, uncachedTexts);
      if (dbHits.size > 0) {
        const stillMissingIdx: number[] = [];
        const stillMissingTxt: string[] = [];
        for (let k = 0; k < uncachedTexts.length; k++) {
          const text = uncachedTexts[k];
          const hit = dbHits.get(text);
          const localIdx = uncachedIdx[k];
          if (hit && !this.isSuspiciousTranslation(text, hit)) {
            segmentResults[localIdx] = hit;
            segmentTranslated[localIdx] = true;
            this.setInCache(locale, text, hit).catch(() => {});
          } else {
            stillMissingIdx.push(localIdx);
            stillMissingTxt.push(text);
          }
        }
        uncachedIdx = stillMissingIdx;
        uncachedTexts = stillMissingTxt;
      }
    }

    this.logger.log(
      `HTML translation: ${textSegments.length} segments, ${uncachedTexts.length} need Gemini → locale=${locale}`,
    );

    // 4. Translate uncached via Gemini in chunks
    if (uncachedTexts.length > 0) {
      const CHUNK_SIZE = 30;
      for (let i = 0; i < uncachedTexts.length; i += CHUNK_SIZE) {
        const chunk = uncachedTexts.slice(i, i + CHUNK_SIZE);
        const chunkLocalIdx = uncachedIdx.slice(i, i + CHUNK_SIZE);

        try {
          const translations = await this.callGemini(chunk, locale);
          const toPersist: Array<{ sourceText: string; translation: string }> = [];
          for (let j = 0; j < chunk.length; j++) {
            const translation =
              translations[j] !== undefined ? translations[j] : chunk[j];
            const isActualTranslation = !this.isSuspiciousTranslation(
              chunk[j],
              translation,
            );
            segmentResults[chunkLocalIdx[j]] = translation;
            segmentTranslated[chunkLocalIdx[j]] = isActualTranslation;
            if (isActualTranslation) {
              this.setInCache(locale, chunk[j], translation).catch(() => {});
              toPersist.push({ sourceText: chunk[j], translation });
            }
          }
          this.saveToDb(locale, toPersist).catch(() => {});
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

    // 6. Cache the full assembled document (Tier 2 + Tier 3)
    if (translated) {
      this.redisService.set(htmlRedisKey, translatedHtml).catch(() => {});
      this.prisma.htmlTranslation
        .upsert({
          where: { locale_contentHash: { locale, contentHash } },
          create: {
            locale,
            contentHash,
            html: translatedHtml,
            model: this.MODEL_NAME,
          },
          update: { html: translatedHtml, model: this.MODEL_NAME },
        })
        .catch((err) =>
          this.logger.warn(
            `DB HTML save failed (non-fatal): ${(err as Error).message}`,
          ),
        );
    }

    return {
      html: translatedHtml,
      contentHash,
      fromCache: false,
      translated,
    };
  }
}
