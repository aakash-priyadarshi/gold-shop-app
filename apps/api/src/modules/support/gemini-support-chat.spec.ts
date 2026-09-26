import {
  buildGeminiSupportGenerationConfig,
  extractGeminiResponseParts,
  formatGeminiDiagnostics,
  isTruncatedGeminiResponse,
  isTruncationFinishReason,
  mergeGeminiContinuation,
} from "./gemini-support-chat";
import { clampReply } from "./chat-limits";

describe("gemini-support-chat", () => {
  it("sets thinkingBudget 0 for Gemini 2.5 Flash public chat", () => {
    const config = buildGeminiSupportGenerationConfig("public", 0.3);
    expect(config).toMatchObject({
      temperature: 0.3,
      maxOutputTokens: 768,
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

  it("does not guess truncation from punctuation or missing metadata", () => {
    expect(isTruncatedGeminiResponse("In Orivraa'", undefined)).toBe(false);
    expect(isTruncatedGeminiResponse("**Jobs**", "STOP")).toBe(false);
    expect(isTruncatedGeminiResponse("", "SAFETY")).toBe(false);
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

  it("uses larger bounded budgets for complex questions, not the entire history", () => {
    expect(buildGeminiSupportGenerationConfig("dashboard", 0.3, "Explain Workshop features in a table").maxOutputTokens).toBe(4096);
    expect(buildGeminiSupportGenerationConfig("public", 0.3, "Explain Workshop features in a table").maxOutputTokens).toBe(2048);
    expect(buildGeminiSupportGenerationConfig("admin", 0.3, "Hi").maxOutputTokens).toBe(768);
  });

  it("merges exact overlaps without altering token or Markdown boundaries", () => {
    const paragraph = "Track all physical material movements.";
    expect(mergeGeminiContinuation(`**Metal**\n${paragraph}`, `${paragraph}\n\n**QC**`)).toBe(`**Metal**\n${paragraph}\n\n**QC**`);
    expect(mergeGeminiContinuation(`${paragraph}\n\n`, `\n\n${paragraph}\n\n**QC**`)).toBe(`${paragraph}\n\n**QC**`);
    expect(mergeGeminiContinuation("**Recovery**", "**Recovery**\nDetails")).toBe("**Recovery**\nDetails");
    expect(mergeGeminiContinuation("work", "shop")).toBe("workshop");
    expect(mergeGeminiContinuation("| Jobs | Work", " orders |\n")).toBe("| Jobs | Work orders |\n");
    expect(mergeGeminiContinuation("```js\nconst x =", " 1;\n```\n")).toBe("```js\nconst x = 1;\n```\n");
    expect(extractGeminiResponseParts({ candidates: [{ content: { parts: [{ text: " rows |\n" }] } }] }).text).toBe(" rows |\n");
  });

  it("still clamps long complete replies for public audience", () => {
    const long = "word ".repeat(120).trim();
    const clamped = clampReply(long, 400);
    expect(clamped.length).toBeLessThanOrEqual(400);
    expect(clamped.endsWith("…")).toBe(true);
  });

  it("keeps hard-break spaces and indentation when removing repeated paragraphs", () => {
    const paragraph = "Track all physical material movements.";
    expect(mergeGeminiContinuation(`${paragraph}  \n`, `${paragraph}\nNext line`)).toBe(`${paragraph}  \nNext line`);
    expect(mergeGeminiContinuation(`${paragraph}\n\n`, `${paragraph}\n\n    code`)).toBe(`${paragraph}\n\n    code`);
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
