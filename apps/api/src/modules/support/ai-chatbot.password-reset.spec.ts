import { AiChatbotService } from "./ai-chatbot.service";

describe("AiChatbotService - sendPasswordReset security boundary", () => {
  let service: AiChatbotService;
  let authService: { forgotPassword: jest.Mock };
  let supportService: { logAiChat: jest.Mock };

  beforeEach(() => {
    authService = { forgotPassword: jest.fn().mockResolvedValue({ message: "ok" }) };
    supportService = { logAiChat: jest.fn().mockResolvedValue(undefined) };

    service = new AiChatbotService(
      { get: jest.fn().mockReturnValue("fake-api-key") } as any,
      {} as any,
      authService as any,
      {} as any,
      supportService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("fails closed and does not trigger forgotPassword when audience is public", async () => {
    const res = await (service as any).handleFunctionCall(
      { name: "sendPasswordReset", args: { email: "user@example.com" } },
      "127.0.0.1",
      "session-1",
      {
        audience: "public",
        authenticatedEmail: undefined,
        latestUserMessage: "reset my password user@example.com",
      },
    );

    expect(authService.forgotPassword).not.toHaveBeenCalled();
    expect(res.reply).toContain("/auth/forgot-password");
  });

  it("fails closed when requested email does not match authenticatedEmail", async () => {
    const res = await (service as any).handleFunctionCall(
      { name: "sendPasswordReset", args: { email: "target@example.com" } },
      "127.0.0.1",
      "session-2",
      {
        audience: "dashboard",
        authenticatedEmail: "attacker@example.com",
        latestUserMessage: "reset password for target@example.com",
      },
    );

    expect(authService.forgotPassword).not.toHaveBeenCalled();
    expect(res.reply).toContain("/auth/forgot-password");
  });

  it("fails closed when authenticatedEmail is missing on dashboard audience", async () => {
    const res = await (service as any).handleFunctionCall(
      { name: "sendPasswordReset", args: { email: "user@example.com" } },
      "127.0.0.1",
      "session-3",
      {
        audience: "dashboard",
        authenticatedEmail: undefined,
        latestUserMessage: "reset user@example.com",
      },
    );

    expect(authService.forgotPassword).not.toHaveBeenCalled();
    expect(res.reply).toContain("/auth/forgot-password");
  });

  it("calls forgotPassword when signed-in user requests reset for their own email (case-insensitive)", async () => {
    const res = await (service as any).handleFunctionCall(
      { name: "sendPasswordReset", args: { email: "User.Owner@Example.COM " } },
      "192.168.1.100",
      "session-4",
      {
        audience: "dashboard",
        authenticatedEmail: "user.owner@example.com",
        latestUserMessage: "please reset my password",
      },
    );

    expect(authService.forgotPassword).toHaveBeenCalledWith("user.owner@example.com", "192.168.1.100");
    expect(res.reply).toContain("six-digit password reset code");
    expect(supportService.logAiChat).toHaveBeenCalledWith(
      "session-4",
      "assistant",
      expect.stringContaining("six-digit password reset code"),
      "sendPasswordReset",
      1.0,
      "192.168.1.100",
    );
  });
});
