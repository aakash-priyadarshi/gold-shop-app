/** Must stay below the API `ArrayMaxSize` (currently 200, previously 100). */
export const TRANSLATION_BATCH_CHUNK_SIZE = 80;
export const TRANSLATION_MAX_TEXT_LENGTH = 2000;

/**
 * Drop empties, oversize strings, and duplicates while preserving first-seen
 * order. The API returns translations in the same order as this array.
 */
export function prepareTranslationBatch(texts: string[]): string[] {
  const seen = new Set<string>();
  const prepared: string[] = [];

  for (const raw of texts) {
    if (typeof raw !== "string") continue;
    const text = raw.trim();
    if (!text || text.length > TRANSLATION_MAX_TEXT_LENGTH) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    prepared.push(text);
  }

  return prepared;
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
