import {
  appendTruncationRetrySuffix,
  buildGeminiSupportGenerationConfig,
  extractGeminiResponseParts,
  formatGeminiDiagnostics,
  isTruncatedGeminiResponse,
  isTruncationFinishReason,
} from "./gemini-support-chat";
import { clampReply } from "./chat-limits";

describe("gemini-support-chat", () => {
  it("sets thinkingBudget 0 for Gemini 2.5 Flash public chat", () => {
    const config = buildGeminiSupportGenerationConfig("public", 0.3);
    expect(config).toMatchObject({
      temperature: 0.3,
      maxOutputTokens: 256,
      topP: 0.8,
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(config).not.toHaveProperty("thinkingLevel");
  });

  it("extracts visible text and ignores thought parts", () => {
    const extracted = extractGeminiResponseParts({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "hidden reasoning should not appear" },
              { text: "Visible answer about karigar wages." },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 42,
        thoughtsTokenCount: 80,
        totalTokenCount: 222,
      },
    });
    expect(extracted.text).toBe("Visible answer about karigar wages.");
    expect(extracted.finishReason).toBe("STOP");
    expect(extracted.usageMetadata?.thoughtsTokenCount).toBe(80);
  });

  it("detects MAX_TOKENS as truncation", () => {
    expect(isTruncationFinishReason("MAX_TOKENS")).toBe(true);
    expect(
      isTruncatedGeminiResponse("Physical metal return is when an artisan (", "MAX_TOKENS"),
    ).toBe(true);
  });

  it("detects short incomplete answers without terminal punctuation", () => {
    expect(isTruncatedGeminiResponse("In Orivraa'", undefined)).toBe(true);
    expect(
      isTruncatedGeminiResponse(
        "Wage settlement pays accrued wages; metal return moves physical gold.",
        "STOP",
      ),
    ).toBe(false);
  });

  it("formats diagnostics without leaking reply content", () => {
    const line = formatGeminiDiagnostics({
      text: "secret reply body",
      finishReason: "MAX_TOKENS",
      usageMetadata: {
        promptTokenCount: 500,
        candidatesTokenCount: 12,
        thoughtsTokenCount: 150,
        totalTokenCount: 662,
      },
    }, "publicChat");
    expect(line).toContain("finishReason=MAX_TOKENS");
    expect(line).toContain("thoughtTokens=150");
    expect(line).not.toContain("secret reply");
  });

  it("appends retry suffix only to the latest user turn", () => {
    const contents = [
      { role: "user", parts: [{ text: "first" }] },
      { role: "model", parts: [{ text: "ok" }] },
      { role: "user", parts: [{ text: "second question" }] },
    ];
    const retry = appendTruncationRetrySuffix(contents);
    expect(retry[0].parts?.[0]?.text).toBe("first");
    expect(retry[2].parts?.[0]?.text).toContain("second question");
    expect(retry[2].parts?.[0]?.text).toContain("complete sentences");
  });

  it("still clamps long complete replies for public audience", () => {
    const long = "word ".repeat(120).trim();
    const clamped = clampReply(long, 400);
    expect(clamped.length).toBeLessThanOrEqual(400);
    expect(clamped.endsWith("…")).toBe(true);
  });

  it("extracts function calls from Gemini parts", () => {
    const extracted = extractGeminiResponseParts({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                functionCall: {
                  name: "captureLeadContact",
                  args: { contactType: "email", contactValue: "a@b.com" },
                },
              },
            ],
          },
        },
      ],
    });
    expect(extracted.functionCall?.name).toBe("captureLeadContact");
    expect(extracted.text).toBe("");
  });
});
