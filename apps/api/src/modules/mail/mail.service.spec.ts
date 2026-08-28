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
});
