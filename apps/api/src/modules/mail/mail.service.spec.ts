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

  it("renders the branded recovery email with the CEO signature", async () => {
    const template = await (service as any).loadTemplate("recovery-offer");
    const html = template(
      (service as any).buildTemplateContext({
        emailSubject: "A personal welcome-back offer",
        emailHeading: "We made Orivraa better for your shop",
        emailBody: "The reliability improvements are now live.",
        firstName: "Alice",
        shopName: "Alice Gold",
        days: 50,
        claimUrl: "https://www.orivraa.com/recovery/pro#token=test",
        unsubscribeUrl:
          "https://www.orivraa.com/offers/unsubscribe?token=user-1.sig",
        offerExpiresAt: new Date("2026-10-01T00:00:00.000Z"),
        brandIconUrl:
          "https://www.orivraa.com/favicon/android-chrome-192x192.png",
        heroImageUrl: "https://www.orivraa.com/luxury-gold-globe.png",
      }),
    );

    expect(html).toContain("50 days free");
    expect(html).toContain("A personal welcome-back offer");
    expect(html).toContain("We made Orivraa better for your shop");
    expect(html).toContain("The reliability improvements are now live.");
    expect(html).toContain("Founder &amp; CEO, Orivraa");
    expect(html).toContain("luxury-gold-globe.png");
    expect(html).toContain("Return to Orivraa and claim Pro");
    expect(html).toContain("/offers/unsubscribe?token");
    expect(html).toContain("Unsubscribe from future offers");
    expect(html).not.toContain("Reply “unsubscribe”");
  });

  it("renders a festival email with both offer actions", async () => {
    const template = await (service as any).loadTemplate("festival-offer");
    const html = template(
      (service as any).buildTemplateContext({
        campaignName: "Dashain 2026",
        emailHeading: "Celebrate your jewellery business",
        emailBody: "A seasonal offer for your shop.",
        firstName: "Alice",
        days: 14,
        discountPercent: 10,
        claimUrl: "https://www.orivraa.com/offers/festival-dashain-2026",
        unsubscribeUrl:
          "https://www.orivraa.com/offers/unsubscribe?token=user-1.sig",
        pricingUrl:
          "https://www.orivraa.com/dashboard/shop/billing?tab=upgrade",
        saleStartsAt: new Date("2026-09-20T00:00:00.000Z"),
        saleEndsAt: new Date("2026-10-05T00:00:00.000Z"),
        brandIconUrl:
          "https://www.orivraa.com/favicon/android-chrome-192x192.png",
        heroImageUrl: "https://www.orivraa.com/luxury-gold-globe.png",
      }),
    );

    expect(html).toContain("14 days Pro free");
    expect(html).toContain("then 10% off the paid plan you choose");
    expect(html).toContain("Buy a plan with 10% off");
    expect(html).toContain(
      '<p style="margin:0 0 14px;font-size:16px;color:#344054">A seasonal offer for your shop.</p>',
    );
    expect(html).toContain("/offers/unsubscribe?token");
    expect(html).toContain("Unsubscribe from future offers");
    expect(html).not.toContain("Reply “unsubscribe”");
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
      attachments: [
        {
          filename: "header.gif",
          content: Buffer.from("GIF89a"),
          contentType: "image/gif",
          contentId: "offer-header-1",
        },
      ],
    });

    expect(result).toEqual({ success: true, messageId: "smtp-message-1" });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "Resend-Idempotency-Key": "recovery-offer-1",
        },
        attachments: [
          {
            filename: "header.gif",
            content: Buffer.from("GIF89a"),
            contentType: "image/gif",
            cid: "offer-header-1",
            contentDisposition: "inline",
          },
        ],
      }),
    );
  });

  it("passes inline image content IDs to the Resend API", async () => {
    const resendService = new MailService({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any);
    const send = jest.fn().mockResolvedValue({
      data: { id: "resend-inline-1" },
      error: null,
    });
    Object.assign(resendService as any, {
      provider: "resend",
      resend: { emails: { send } },
    });
    jest
      .spyOn(resendService as any, "loadTemplate")
      .mockResolvedValue(() => '<img src="cid:offer-header-1" />');

    await resendService.send({
      to: "owner@example.com",
      subject: "Festival offer",
      template: "festival-offer",
      context: {},
      attachments: [
        {
          filename: "header.gif",
          content: Buffer.from("GIF89a"),
          contentType: "image/gif",
          contentId: "offer-header-1",
        },
      ],
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          {
            filename: "header.gif",
            content: Buffer.from("GIF89a"),
            contentType: "image/gif",
            contentId: "offer-header-1",
          },
        ],
      }),
      undefined,
    );
  });

  it("passes campaign tags to the Resend API", async () => {
    const resendService = new MailService({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any);
    const send = jest.fn().mockResolvedValue({
      data: { id: "resend-email-1" },
      error: null,
    });
    Object.assign(resendService as any, {
      provider: "resend",
      resend: { emails: { send } },
    });
    jest
      .spyOn(resendService as any, "loadTemplate")
      .mockResolvedValue(() => "<p>Recovery offer</p>");

    const result = await resendService.send({
      to: "owner@example.com",
      subject: "Recovery offer",
      template: "recovery-offer",
      context: {},
      idempotencyKey: "recovery-offer-1",
      tags: [
        { name: "category", value: "recovery_offer" },
        { name: "offer_id", value: "offer-1" },
      ],
    });

    expect(result).toEqual({ success: true, messageId: "resend-email-1" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [
          { name: "category", value: "recovery_offer" },
          { name: "offer_id", value: "offer-1" },
        ],
      }),
      { idempotencyKey: "recovery-offer-1" },
    );
  });

  it("passes List-Unsubscribe headers to Resend", async () => {
    const resendService = new MailService({
      get: (_key: string, fallback?: unknown) => fallback,
    } as any);
    const send = jest.fn().mockResolvedValue({
      data: { id: "resend-email-1" },
      error: null,
    });
    Object.assign(resendService as any, {
      provider: "resend",
      resend: { emails: { send } },
    });
    jest
      .spyOn(resendService as any, "loadTemplate")
      .mockResolvedValue(() => "<p>Recovery offer</p>");

    await resendService.send({
      to: "owner@example.com",
      subject: "Recovery offer",
      template: "recovery-offer",
      context: {},
      headers: {
        "List-Unsubscribe":
          "<https://api.orivraa.com/api/recovery-offers/unsubscribe?token=abc>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          "List-Unsubscribe":
            "<https://api.orivraa.com/api/recovery-offers/unsubscribe?token=abc>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
      undefined,
    );
  });
});
