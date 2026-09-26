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
  interrupted?: boolean;
};

export const MAX_CONTINUATIONS = 2;
export const SUPPORT_GENERATION_TIMEOUT_MS = 60000;
export const GEMINI_CONTINUATION_INSTRUCTION =
  "Continue the previous answer exactly where it stopped. Do not repeat earlier content or restart the answer. Complete the remaining answer, including any unfinished Markdown table or code fence. Include any whitespace or newline needed at the join. Return only the continuation, without a preamble or tool calls.";

const TRUNCATION_FINISH_REASONS = new Set(["MAX_TOKENS", "LENGTH"]);

/**
 * Gemini 2.5 Flash defaults to dynamic thinking when thinkingBudget is unset,
 * which can consume the small public maxOutputTokens budget before visible text.
 */
export function buildGeminiSupportGenerationConfig(
  audience: ChatAudience,
  temperature = 0.3,
  request = "",
): Record<string, unknown> {
  // A short turn gets a modest budget; comparisons, walkthroughs and substantial
  // questions can use the audience ceiling. These are maxima, not length targets.
  const detailed = request.length > 240 ||
    /\b(compare|comparison|table|detail(?:ed)?|step.by.step|explain|features|workflow|summary|report)\b/i.test(request);
  const budget = detailed ? CHAT_LIMITS[audience].maxOutputTokens : request.length > 100 ? 1536 : 768;
  return {
    temperature,
    maxOutputTokens: Math.min(budget, CHAT_LIMITS[audience].maxOutputTokens),
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
    .join(""); // Continuations may begin/end inside a word, table row or code fence.

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
  return TRUNCATION_FINISH_REASONS.has(finishReason.toUpperCase());
}

/**
 * Only provider metadata establishes output-limit truncation. In particular a
 * normal STOP on a short label, list or table is not an interrupted sentence.
 */
export function isTruncatedGeminiResponse(
  _text: string,
  finishReason?: string,
): boolean {
  return isTruncationFinishReason(finishReason);
}

/** Remove obvious repeated suffixes, never small incidental word overlaps. */
export function mergeGeminiContinuation(previous: string, continuation: string): string {
  // Models sometimes restart a paragraph after leading blank lines. Ignore only
  // boundary whitespace while looking for overlap; preserve raw text otherwise.
  const before = previous.trimEnd();
  const after = continuation.trimStart();
  const appendRemainder = (remainder: string) => {
    // Preserve the original trailing spaces (Markdown hard breaks/indentation),
    // removing only identical whitespace repeated by the continuation.
    const leadingWhitespace = remainder.match(/^\s*/)?.[0] || "";
    for (let size = Math.min(previous.length - before.length, leadingWhitespace.length); size > 0; size--) {
      if (previous.endsWith(leadingWhitespace.slice(0, size))) {
        return previous + remainder.slice(size);
      }
    }
    return previous + remainder;
  };
  if (after.length >= 24 && before.endsWith(after)) return previous;
  for (let length = Math.min(before.length, after.length, 4096); length >= 24; length--) {
    if (before.endsWith(after.slice(0, length))) {
      return appendRemainder(after.slice(length));
    }
  }
  const lastLine = before.split("\n").at(-1) || "";
  if (lastLine.length >= 8 && /^(?:#{1,6} |\*\*)/.test(lastLine) && after.startsWith(lastLine)) {
    return appendRemainder(after.slice(lastLine.length));
  }
  return previous + continuation;
}
