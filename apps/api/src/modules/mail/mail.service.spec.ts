import { MailService } from "./mail.service";

describe("MailService template rendering", () => {
  const service = new MailService({
    get: (_key: string, fallback?: unknown) => fallback,
  } as any);

  it("compiles HTML templates with escaped interpolation and missing variables", () => {
    const html = service.renderTemplateString(
      "<p>{{name}}</p><p>{{missing}}</p>",
      { name: "<Alice>" },
    );
    expect(html).toContain("&lt;Alice&gt;");
    expect(html).toContain("<p></p>");
  });

  it("renders text-style templates and registered helpers", () => {
    const text = service.renderTemplateString(
      "Hello {{uppercase name}} — {{formatCurrency amount currency}}",
      { name: "alice", amount: 1234.5, currency: "USD" },
    );
    expect(text).toContain("ALICE");
    expect(text).toContain("$1,234.50");
  });

  it("compiles the existing OTP email template", async () => {
    const template = await (service as any).loadTemplate("otp");
    const html = template(
      (service as any).buildTemplateContext({
        otp: "123456",
        name: "Alice",
        expiresIn: "10 minutes",
      }),
    );
    expect(html).toContain("123456");
    expect(html).toContain("Orivraa");
  });

  it("preserves idempotency keys for Resend SMTP delivery", async () => {
    const smtpService = new MailService({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any);
    const sendMail = jest
      .fn()
      .mockResolvedValue({ messageId: "smtp-message-1" });
    Object.assign(smtpService as any, {
      provider: "smtp",
      smtpHost: "smtp.resend.com",
      transporter: { sendMail },
    });
    jest
      .spyOn(smtpService as any, "loadTemplate")
      .mockResolvedValue(() => "<p>Recovery offer</p>");

    const result = await smtpService.send({
      to: "owner@example.com",
      subject: "Recovery offer",
      template: "recovery-offer",
      context: {},
      idempotencyKey: "recovery-offer-1",
    });

    expect(result).toEqual({ success: true, messageId: "smtp-message-1" });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "Resend-Idempotency-Key": "recovery-offer-1",
        },
      }),
    );
  });
});
