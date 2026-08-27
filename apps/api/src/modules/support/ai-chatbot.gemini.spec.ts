import { AiChatbotService } from "./ai-chatbot.service";
import {
  extractGeminiResponseParts,
  isTruncatedGeminiResponse,
} from "./gemini-support-chat";

describe("AiChatbotService - Gemini truncation handling", () => {
  let service: AiChatbotService;
  let supportService: {
    logAiChat: jest.Mock;
    saveLeadContact: jest.Mock;
    setAwaitingContact: jest.Mock;
  };

  beforeEach(() => {
    supportService = {
      logAiChat: jest.fn().mockResolvedValue(undefined),
      saveLeadContact: jest.fn().mockResolvedValue(undefined),
      setAwaitingContact: jest.fn().mockResolvedValue(undefined),
    };

    service = new AiChatbotService(
      { get: jest.fn().mockReturnValue("fake-api-key") } as any,
      {} as any,
      {} as any,
      {} as any,
      supportService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("does not return partial MAX_TOKENS text as the final public answer", async () => {
    const truncated = extractGeminiResponseParts({
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: {
            parts: [{ text: "Physical metal return is when an artisan (" }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 900,
        candidatesTokenCount: 18,
        thoughtsTokenCount: 160,
        totalTokenCount: 1078,
      },
    });

    expect(
      isTruncatedGeminiResponse(truncated.text, truncated.finishReason),
    ).toBe(true);

    const fallback = (service as any).truncatedChatFallback(
      "public",
      "What is the difference?",
    );
    expect(fallback.confidence).toBeLessThan(0.8);
    expect(fallback.reply).toContain("support ticket");
    expect(fallback.reply).not.toContain("when an artisan (");
  });

  it("callGeminiSupportChat sends thinkingBudget 0 in generationConfig", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: "Complete concise answer." }] },
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 8,
            thoughtsTokenCount: 0,
            totalTokenCount: 18,
          },
        }),
      });
    global.fetch = fetchMock as any;

    const result = await (service as any).callGeminiSupportChat({
      contents: [{ role: "user", parts: [{ text: "How does GST work?" }] }],
      tools: [{ functionDeclarations: [] }],
      audience: "public",
      logContext: "test",
    });

    expect(result?.text).toBe("Complete concise answer.");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(body.generationConfig.maxOutputTokens).toBe(256);
  });

  it("retries once when the first Gemini reply is truncated", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: { parts: [{ text: "In Orivraa'" }] },
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 5,
            thoughtsTokenCount: 170,
            totalTokenCount: 275,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: "Metal return moves physical gold; wage settlement pays accrued wages.",
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 120,
            candidatesTokenCount: 30,
            thoughtsTokenCount: 0,
            totalTokenCount: 150,
          },
        }),
      });
    global.fetch = fetchMock as any;

    const result = await (service as any).callGeminiSupportChat({
      contents: [
        { role: "user", parts: [{ text: "Metal return vs wage settlement?" }] },
      ],
      tools: [{ functionDeclarations: [] }],
      audience: "public",
      logContext: "test-retry",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result?.text).toContain("wage settlement");
    expect(result?.finishReason).toBe("STOP");
  });
});
