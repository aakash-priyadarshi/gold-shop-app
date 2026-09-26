import { AiChatbotService } from "./ai-chatbot.service";
import { CHAT_LIMITS } from "./chat-limits";
import { MAX_CONTINUATIONS, SUPPORT_GENERATION_TIMEOUT_MS } from "./gemini-support-chat";

const response = (text: string, finishReason = "STOP", functionCall?: object) => ({
  ok: true,
  json: async () => ({ candidates: [{ finishReason, content: { parts: [{ text, ...(functionCall ? { functionCall } : {}) }] } }] }),
});

describe("AiChatbotService - bounded Gemini completion", () => {
  let service: AiChatbotService;
  let support: { logAiChat: jest.Mock; upsertBotSession: jest.Mock; getSessionAwaitingContact: jest.Mock; setAwaitingContact: jest.Mock };
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;
  const originalBudget = CHAT_LIMITS.public.maxOutputTokens;

  beforeEach(() => {
    support = {
      logAiChat: jest.fn().mockResolvedValue(undefined),
      upsertBotSession: jest.fn().mockResolvedValue(undefined),
      getSessionAwaitingContact: jest.fn().mockResolvedValue(false),
      setAwaitingContact: jest.fn().mockResolvedValue(undefined),
    };
    service = new AiChatbotService(
      { get: jest.fn().mockReturnValue("test-only-key") } as any,
      {} as any, {} as any, {} as any, support as any,
      {} as any, {} as any, { incr: jest.fn().mockResolvedValue(1) } as any, {} as any,
    );
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    jest.spyOn(service as any, "searchKnowledge").mockResolvedValue("");
    jest.spyOn(service as any, "listLiveWorkshopPlans").mockResolvedValue([]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    CHAT_LIMITS.public.maxOutputTokens = originalBudget;
    jest.restoreAllMocks();
  });

  const call = (service: AiChatbotService) => (service as any).callGeminiSupportChat({
    contents: [{ role: "user", parts: [{ text: "Explain Workshop features" }] }],
    tools: [{ functionDeclarations: [{ name: "sendPasswordReset" }] }],
    audience: "public", logContext: "test",
  });

  it("forces a low token budget, continues and persists one complete answer with no overlap", async () => {
    CHAT_LIMITS.public.maxOutputTokens = 4;
    const partial = "**Jobs**\nTrack the workshop production order.";
    const end = "\n\n| Area | Purpose |\n|---|---|\n| QC | Approve pieces |";
    fetchMock.mockResolvedValueOnce(response(partial, "MAX_TOKENS"))
      .mockResolvedValueOnce(response("Track the workshop production order." + end));
    const result = await service.chat("Explain Workshop features", [], "127.0.0.1", "test-session");
    expect(result.reply).toBe(partial + end);
    expect(result.interrupted).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(firstBody.generationConfig.maxOutputTokens).toBe(4);
    expect(firstBody.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    const continuation = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(continuation).not.toHaveProperty("tools");
    expect(continuation.contents.slice(-2)).toEqual([
      { role: "model", parts: [{ text: partial }] },
      { role: "user", parts: [{ text: expect.stringContaining("Continue the previous answer exactly") }] },
    ]);
    const saved = support.logAiChat.mock.calls.filter((args) => args[1] === "assistant");
    expect(saved).toHaveLength(1);
    expect(saved[0][2]).toBe(result.reply);
  });

  it.each(["Yes", "**Jobs**", "| Jobs | Orders |", "A complete answer."])("does not continue STOP output %s", async (text) => {
    fetchMock.mockResolvedValue(response(text));
    expect((await call(service)).text).toBe(text);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a long complete reply intact in response, persistence and bounded next-turn context", async () => {
    const complete = "## Workshop\n" + "Useful complete answer. ".repeat(150);
    fetchMock.mockResolvedValue(response(complete));
    const result = await service.chat("Explain Workshop features", [], undefined, "test-session");
    expect(result.reply).toBe(complete.trim());
    expect(support.logAiChat).toHaveBeenCalledWith("test-session", "assistant", result.reply, undefined, 0.8, undefined);
    const prepared = (service as any).prepareChatTurn("public", "Thanks", [{ role: "assistant", content: result.reply }]);
    expect(prepared.history[0].content).toBe(result.reply);
  });

  it("caps public history before the initial provider call and continuation", async () => {
    const history = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: String(i).repeat(6000),
    }));
    fetchMock.mockResolvedValueOnce(response("Partial answer", "MAX_TOKENS"))
      .mockResolvedValueOnce(response(" completed."));

    await service.chat("Explain Workshop features", history, undefined, "test-session");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const initial = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(initial.contents).toHaveLength(5); // System, greeting, two history items, current turn.
    expect(initial.contents.slice(2, -1)).toEqual(history.slice(-2).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })));
    const continuation = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(continuation.contents.slice(0, -2)).toEqual(initial.contents);
    expect(history).toHaveLength(8);
  });

  it.each(["dashboard", "admin"])("does not apply the public aggregate budget to %s history", (audience) => {
    const history = Array.from({ length: 8 }, () => ({
      role: "assistant" as const,
      content: "x".repeat(6000),
    }));
    expect((service as any).prepareChatTurn(audience, "Thanks", history).history).toEqual(history);
  });

  it("shows and saves an explicit retry fallback for whitespace-only STOP without continuing", async () => {
    fetchMock.mockResolvedValue(response(" \n ", "STOP"));
    const result = await service.chat("Explain Workshop features", [], undefined, "test-session");
    expect(result.reply).toContain("Please try again");
    expect(result.confidence).toBeLessThan(0.8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(support.logAiChat).toHaveBeenCalledWith("test-session", "assistant", result.reply, undefined, result.confidence, undefined);
  });

  it("caps continuation at two calls and marks the combined answer interrupted", async () => {
    fetchMock.mockResolvedValueOnce(response("First section", "MAX_TOKENS"))
      .mockResolvedValueOnce(response("\nSecond section", "MAX_TOKENS"))
      .mockResolvedValueOnce(response("\nThird section", "MAX_TOKENS"));
    const result = await service.chat("Explain Workshop features", [], undefined, "test-session");
    expect(fetchMock).toHaveBeenCalledTimes(1 + MAX_CONTINUATIONS);
    expect(result).toMatchObject({ reply: "First section\nSecond section\nThird section", interrupted: true });
    expect(support.logAiChat).toHaveBeenCalledWith("test-session", "assistant", result.reply, "responseInterrupted", 0.8, undefined);
  });

  it.each(["seller", "admin"])("persists the complete %s answer once, not individual continuations", async (audience) => {
    jest.spyOn(service as any, "buildSellerSnapshot").mockResolvedValue({ sellerName: "Example", workshopPlanNames: [] });
    jest.spyOn(service as any, "maybeAnswerSellerQuestion").mockReturnValue(null);
    jest.spyOn(service as any, "buildSellerContext").mockReturnValue("");
    jest.spyOn(service as any, "buildAdminSnapshot").mockResolvedValue({ adminName: "Example" });
    jest.spyOn(service as any, "buildAdminContext").mockReturnValue("");
    const partial = "**Workshop**\n" + "An important detail. ".repeat(100);
    fetchMock.mockResolvedValueOnce(response(partial, "MAX_TOKENS"))
      .mockResolvedValueOnce(response("\n\nCompleted."));
    const result = audience === "seller"
      ? await service.sellerChat("shop-id", "user-id", "Explain Workshop features", [], undefined, "test-session")
      : await service.adminChat("user-id", "Explain Workshop features", [], undefined, "test-session");
    expect(result.reply).toBe(partial + "\n\nCompleted.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const saved = support.logAiChat.mock.calls.filter((args) => args[1] === "assistant");
    expect(saved).toHaveLength(1);
    expect(saved[0][2]).toBe(result.reply);
  });

  it.each(["http", "network", "safety", "empty", "tool", "repeat"])("preserves partial output and reports interruption on %s continuation", async (failure) => {
    const partial = "Track the workshop production order.";
    fetchMock.mockResolvedValueOnce(response(partial, "MAX_TOKENS"));
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("offline"));
    else if (failure === "http") fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    else if (failure === "tool") fetchMock.mockResolvedValueOnce(response("", "STOP", { name: "sendPasswordReset" }));
    else fetchMock.mockResolvedValueOnce(response(failure === "repeat" ? partial : "", failure === "safety" ? "SAFETY" : "STOP"));
    expect(await call(service)).toMatchObject({ text: partial, interrupted: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not continue or replay initial tool calls", async () => {
    const functionCall = { name: "sendPasswordReset", args: {} };
    fetchMock.mockResolvedValue(response("", "STOP", functionCall));
    expect(await call(service)).toMatchObject({ functionCall });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enforces a total deadline before making another request", async () => {
    const start = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(start);
    fetchMock.mockImplementationOnce(async () => {
      jest.spyOn(Date, "now").mockReturnValue(start + SUPPORT_GENERATION_TIMEOUT_MS);
      return response("Partial answer", "MAX_TOKENS");
    });
    expect(await call(service)).toMatchObject({ interrupted: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("exposes the emergency character guard instead of silently clamping", () => {
    const reply = "x".repeat(CHAT_LIMITS.public.maxReply + 100);
    const result = (service as any).limitReply({ reply, confidence: 0.8, shouldEscalate: false }, "public");
    expect(result.interrupted).toBe(true);
    expect(result.reply.length).toBeLessThanOrEqual(CHAT_LIMITS.public.maxReply);
  });

  it("preserves JSON examples inside a Markdown answer", () => {
    const reply = 'An example:\n```json\n{"reply":"example"}\n```\nKeep this explanation.';
    expect((service as any).parseAiResponse(reply).reply).toBe(reply);
  });

  it("permits contextual Markdown without full-name greetings or character targets", () => {
    const prompt = (service as any).buildSystemPrompt(undefined, { userName: "Example PrivateSurname" });
    expect(prompt).toContain('name is "Example"');
    expect(prompt).not.toContain("PrivateSurname");
    expect(prompt).toContain("Markdown");
    expect(prompt).not.toContain("aim for 2–4 sentences");
  });
});
