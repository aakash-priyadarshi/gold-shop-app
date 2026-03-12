import { ConfigService } from "@nestjs/config";
import { PostCallProcessor } from "./post-call-processor.service";

describe("PostCallProcessor", () => {
  it("returns a minimal report when Gemini is unavailable", async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new PostCallProcessor(config);

    const report = await service.generateCallReport({
      transcript: "Customer asked for pricing.",
      durationSeconds: 45,
    });

    expect(report.summary).toContain("Transcript recorded");
    expect(report.outcome).toBe("neutral");
    expect(report.callQualityScore).toBe(5);
  });

  it("cleans fenced JSON with trailing commas before parsing", async () => {
    const config = { get: jest.fn().mockReturnValue("test-key") } as unknown as ConfigService;
    const service = new PostCallProcessor(config);

    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => "```json\n{\n  \"summary\": \"Strong call\",\n  \"outcome\": \"positive\",\n  \"keyTopics\": [\"pricing\"],\n  \"objectionsRaised\": [],\n  \"buyingSignals\": [\"asked for proposal\"],\n  \"sentimentArc\": \"skeptical to interested\",\n  \"recommendedNextSteps\": [\"Send proposal\",],\n  \"followUpDate\": null,\n  \"dealProbability\": 0.8,\n  \"callQualityScore\": 8,\n}\n```",
          },
        }),
      }),
    };

    const report = await service.generateCallReport({
      transcript: "Customer wants the proposal.",
      durationSeconds: 180,
    });

    expect(report.outcome).toBe("positive");
    expect(report.recommendedNextSteps).toEqual(["Send proposal"]);
    expect(report.dealProbability).toBe(0.8);
  });

  it("falls back to a minimal report when parsing fails", async () => {
    const config = { get: jest.fn().mockReturnValue("test-key") } as unknown as ConfigService;
    const service = new PostCallProcessor(config);

    (service as any).genAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockRejectedValue(new Error("model failed")),
      }),
    };

    const report = await service.generateCallReport({
      transcript: "",
      durationSeconds: 10,
    });

    expect(report.summary).toContain("No transcript available");
    expect(report.outcome).toBe("neutral");
  });

  it("generateSimpleSummary returns a safe fallback without Gemini", async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new PostCallProcessor(config);

    await expect(service.generateSimpleSummary("Hello")).resolves.toBe(
      "Summary unavailable — API key not configured.",
    );
  });
});