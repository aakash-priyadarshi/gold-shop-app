import type { ChatAudience } from "./chat-limits";
import { CHAT_LIMITS } from "./chat-limits";

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
};

export type ExtractedGeminiResponse = {
  functionCall?: { name?: string; args?: Record<string, unknown> };
  text: string;
  finishReason?: string;
  blockReason?: string;
  usageMetadata?: GeminiUsageMetadata;
};

/** Appended once on truncation retry — keeps user question, nudges concise answer. */
export const GEMINI_TRUNCATION_RETRY_SUFFIX =
  "\n\n[Reply in 2–4 complete sentences under 350 characters. No bullet lists. Finish the answer.]";

const TRUNCATION_FINISH_REASONS = new Set(["MAX_TOKENS", "LENGTH"]);

/**
 * Gemini 2.5 Flash defaults to dynamic thinking when thinkingBudget is unset,
 * which can consume the small public maxOutputTokens budget before visible text.
 */
export function buildGeminiSupportGenerationConfig(
  audience: ChatAudience,
  temperature = 0.3,
): Record<string, unknown> {
  return {
    temperature,
    maxOutputTokens: CHAT_LIMITS[audience].maxOutputTokens,
    topP: 0.8,
    thinkingConfig: {
      thinkingBudget: 0,
    },
  };
}

export function extractGeminiUsageMetadata(data: unknown): GeminiUsageMetadata {
  const usage = (data as { usageMetadata?: GeminiUsageMetadata })?.usageMetadata;
  if (!usage) return {};
  return {
    promptTokenCount: usage.promptTokenCount,
    candidatesTokenCount: usage.candidatesTokenCount,
    thoughtsTokenCount: usage.thoughtsTokenCount,
    totalTokenCount: usage.totalTokenCount,
  };
}

export function extractGeminiResponseParts(data: unknown): ExtractedGeminiResponse {
  const payload = data as {
    candidates?: Array<{
      finishReason?: string;
      finishMessage?: string;
      content?: { parts?: Array<Record<string, unknown>> };
    }>;
    promptFeedback?: { blockReason?: string };
    usageMetadata?: GeminiUsageMetadata;
  };

  const candidate = payload?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const blockReason =
    payload?.promptFeedback?.blockReason || candidate?.finishMessage;
  const parts = candidate?.content?.parts;
  const usageMetadata = extractGeminiUsageMetadata(data);

  if (!Array.isArray(parts) || parts.length === 0) {
    return { text: "", finishReason, blockReason, usageMetadata };
  }

  const functionCallPart = parts.find((part) => part?.functionCall);
  const functionCall = functionCallPart?.functionCall as
    | ExtractedGeminiResponse["functionCall"]
    | undefined;

  const text = parts
    .filter((part) => !part?.thought && typeof part?.text === "string")
    .map((part) => part.text as string)
    .join("")
    .trim();

  return { functionCall, text, finishReason, blockReason, usageMetadata };
}

/** Privacy-safe log fields — counts only, no prompts or reply text. */
export function formatGeminiDiagnostics(
  extracted: ExtractedGeminiResponse,
  context?: string,
): string {
  const usage = extracted.usageMetadata ?? {};
  const parts = [
    context ? `ctx=${context}` : null,
    `finishReason=${extracted.finishReason ?? "?"}`,
    extracted.blockReason ? `blockReason=${extracted.blockReason}` : null,
    `replyChars=${extracted.text?.length ?? 0}`,
    usage.promptTokenCount != null
      ? `promptTokens=${usage.promptTokenCount}`
      : null,
    usage.candidatesTokenCount != null
      ? `candidateTokens=${usage.candidatesTokenCount}`
      : null,
    usage.thoughtsTokenCount != null
      ? `thoughtTokens=${usage.thoughtsTokenCount}`
      : null,
    usage.totalTokenCount != null ? `totalTokens=${usage.totalTokenCount}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function isTruncationFinishReason(finishReason?: string): boolean {
  if (!finishReason) return false;
  return TRUNCATION_FINISH_REASONS.has(finishReason);
}

/**
 * Detect incomplete visible answers that should not ship as high-confidence replies.
 */
export function isTruncatedGeminiResponse(
  text: string,
  finishReason?: string,
): boolean {
  if (isTruncationFinishReason(finishReason)) return true;

  const trimmed = (text || "").trim();
  if (!trimmed) return true;

  // Very short answers that do not end a sentence are almost always cut mid-generation.
  if (trimmed.length < 60) {
    return !/[.!?](['"])?$/.test(trimmed);
  }

  // Mid-word / mid-parenthesis endings with no terminal punctuation.
  if (trimmed.length < 160 && /[\w(']$/.test(trimmed)) {
    return !/[.!?](['"])?$/.test(trimmed);
  }

  return false;
}

export function appendTruncationRetrySuffix(
  contents: Array<{ role?: string; parts?: Array<{ text?: string }> }>,
): Array<{ role?: string; parts?: Array<{ text?: string }> }> {
  const copy = contents.map((entry) => ({
    ...entry,
    parts: entry.parts?.map((part) => ({ ...part })),
  }));
  const lastUser = [...copy].reverse().find((entry) => entry.role === "user");
  if (!lastUser?.parts?.length) return copy;
  const lastPart = lastUser.parts[lastUser.parts.length - 1];
  if (typeof lastPart.text === "string") {
    lastPart.text = `${lastPart.text}${GEMINI_TRUNCATION_RETRY_SUFFIX}`;
  }
  return copy;
}
