import { ConfigService } from "@nestjs/config";
import { GeminiStreamingClient } from "./gemini-streaming.service";

async function collectChunks(stream: AsyncGenerator<string, void, unknown>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("GeminiStreamingClient", () => {
  it("detectIntents returns a safe empty result when Gemini is unavailable", async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new GeminiStreamingClient(config);

    await expect(service.detectIntents("bye", ["Riya"])).resolves.toEqual({
      isHandoff: false,
      agentName: null,
      isLanguageSwitch: false,
      language: null,
      isEndCall: false,
      isReschedule: false,
      rescheduleTime: null,
      rescheduleTimezone: null,
    });
  });

  it("detectIntents parses fenced JSON from Gemini", async () => {
    const config = { get: jest.fn().mockReturnValue("test-key") } as unknown as ConfigService;
    const service = new GeminiStreamingClient(config);
    const generateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => "```json\n{\"isHandoff\":true,\"agentName\":\"Riya\",\"isLanguageSwitch\":true,\"language\":\"hi\",\"isEndCall\":true,\"isReschedule\":true,\"rescheduleTime\":\"2026-03-14T10:30:00\",\"rescheduleTimezone\":\"Asia/Kolkata\"}\n```",
      },
    });

    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({ generateContent }),
    };

    await expect(service.detectIntents("Please connect me to Riya and call me tomorrow morning in Hindi", ["Riya"]))
      .resolves.toEqual({
        isHandoff: true,
        agentName: "Riya",
        isLanguageSwitch: true,
        language: "hi",
        isEndCall: true,
        isReschedule: true,
        rescheduleTime: "2026-03-14T10:30:00",
        rescheduleTimezone: "Asia/Kolkata",
      });
  });

  it("detectIntents falls back safely on malformed model output", async () => {
    const config = { get: jest.fn().mockReturnValue("test-key") } as unknown as ConfigService;
    const service = new GeminiStreamingClient(config);

    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => "not-json" },
        }),
      }),
    };

    await expect(service.detectIntents("switch to hindi", [])).resolves.toEqual({
      isHandoff: false,
      agentName: null,
      isLanguageSwitch: false,
      language: null,
      isEndCall: false,
      isReschedule: false,
      rescheduleTime: null,
      rescheduleTimezone: null,
    });
  });

  it("streamResponse returns the fallback sentence when Gemini is unavailable", async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new GeminiStreamingClient(config);

    const chunks = await collectChunks(service.streamResponse("hello", "system", 0));

    expect(chunks.join("")).toContain("Could you tell me more about what you're looking for?");
  });
});