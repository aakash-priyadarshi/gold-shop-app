import { TRANSLATION_TEXT_MAX_LENGTH } from "@gold-shop/shared";

/** Must stay below the API `ArrayMaxSize` (currently 200, previously 100). */
export const TRANSLATION_BATCH_CHUNK_SIZE = 80;
export const TRANSLATION_MAX_TEXT_LENGTH = TRANSLATION_TEXT_MAX_LENGTH;

export interface PreparedTranslationBatch {
  /** Deduped, trimmed strings sent to the API. */
  unique: string[];
  /** Prepared API key → original caller strings (including untrimmed aliases). */
  aliases: Record<string, string[]>;
  /** Original strings that cannot be translated (empty, whitespace, oversize). */
  dropped: string[];
}

/**
 * Drop empties, oversize strings, and duplicates while preserving first-seen
 * order. The API returns translations in the same order as `unique`.
 * Caller keys (`t` / `register`) stay on the original strings via `aliases`.
 */
export function prepareTranslationBatch(texts: string[]): PreparedTranslationBatch {
  const seen = new Set<string>();
  const unique: string[] = [];
  const aliases: Record<string, string[]> = {};
  const dropped: string[] = [];

  for (const raw of texts) {
    if (typeof raw !== "string") continue;
    const key = raw.trim();
    if (!key || key.length > TRANSLATION_MAX_TEXT_LENGTH) {
      dropped.push(raw);
      continue;
    }
    if (!aliases[key]) aliases[key] = [];
    if (!aliases[key].includes(raw)) aliases[key].push(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }

  return { unique, aliases, dropped };
}

/** Write dictionary and cooldown entries for every original caller string. */
export function mapPreparedResultsToOriginals(
  aliases: Record<string, string[]>,
  confirmed: Record<string, string>,
  failedPrepared: string[],
  dropped: string[] = [],
): { confirmed: Record<string, string>; failed: string[] } {
  const expandedConfirmed: Record<string, string> = {};
  for (const [prepared, translation] of Object.entries(confirmed)) {
    for (const raw of aliases[prepared] ?? [prepared]) {
      expandedConfirmed[raw] = translation;
    }
  }

  const failed: string[] = [...dropped];
  for (const prepared of failedPrepared) {
    failed.push(...(aliases[prepared] ?? [prepared]));
  }

  return { confirmed: expandedConfirmed, failed };
}

export function chunkTranslationTexts(
  texts: string[],
  chunkSize = TRANSLATION_BATCH_CHUNK_SIZE,
): string[][] {
  if (chunkSize <= 0) {
    throw new Error("Translation chunk size must be positive");
  }
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push(texts.slice(i, i + chunkSize));
  }
  return chunks;
}

export function mergeTranslationResponse(
  texts: string[],
  translations: string[] | undefined,
  translatedFlags: boolean[] | undefined,
): { confirmed: Record<string, string>; failed: string[] } {
  const confirmed: Record<string, string> = {};
  const failed: string[] = [];

  texts.forEach((text, index) => {
    const translation = translations?.[index];
    const confirmedFlag = Array.isArray(translatedFlags)
      ? translatedFlags[index] === true
      : Boolean(translation) && translation !== text;

    if (translation && confirmedFlag) {
      confirmed[text] = translation;
      return;
    }
    failed.push(text);
  });

  return { confirmed, failed };
}

export function translationBatchErrorDetail(error: unknown): unknown {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: unknown; status?: number } })
      .response;
    if (response?.data !== undefined) {
      return { status: response.status, data: response.data };
    }
  }
  return error;
}
