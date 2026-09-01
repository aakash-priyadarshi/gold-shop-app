import { BadRequestException } from "@nestjs/common";
import { RecoveryOffersWebhookController } from "./recovery-offers.webhook.controller";

const mockVerify = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    webhooks: { verify: mockVerify },
  })),
}));

describe("RecoveryOffersWebhookController", () => {
  const config: any = {
    get: jest.fn((key: string) =>
      key === "RESEND_WEBHOOK_SECRET" ? "whsec_test" : undefined,
    ),
  };
  const recoveryOffers: any = { recordResendEvent: jest.fn() };
  const controller = new RecoveryOffersWebhookController(
    config,
    recoveryOffers,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) =>
      key === "RESEND_WEBHOOK_SECRET" ? "whsec_test" : undefined,
    );
  });

  it("verifies the raw Resend payload before recording an event", async () => {
    const event = {
      type: "email.opened",
      created_at: "2026-09-02T10:00:00.000Z",
      data: { email_id: "email-1" },
    };
    mockVerify.mockReturnValue(event);
    recoveryOffers.recordResendEvent.mockResolvedValue({ processed: true });
    const rawBody = Buffer.from(JSON.stringify(event));

    await expect(
      controller.handleResend({
        rawBody,
        headers: {
          "svix-id": "event-1",
          "svix-timestamp": "1788343200",
          "svix-signature": "v1,signature",
        },
      } as any),
    ).resolves.toEqual({ processed: true });

    expect(mockVerify).toHaveBeenCalledWith({
      payload: rawBody.toString("utf8"),
      headers: {
        id: "event-1",
        timestamp: "1788343200",
        signature: "v1,signature",
      },
      webhookSecret: "whsec_test",
    });
    expect(recoveryOffers.recordResendEvent).toHaveBeenCalledWith(
      "event-1",
      event,
    );
  });

  it("constructs without RESEND_API_KEY so full-app tests can boot", () => {
    expect(
      () =>
        new RecoveryOffersWebhookController(
          { get: jest.fn(() => undefined) } as any,
          recoveryOffers,
        ),
    ).not.toThrow();
  });

  it("rejects missing signature headers", async () => {
    await expect(
      controller.handleResend({
        rawBody: Buffer.from("{}"),
        headers: {},
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(recoveryOffers.recordResendEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid Resend signature", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("signature mismatch");
    });

    await expect(
      controller.handleResend({
        rawBody: Buffer.from("{}"),
        headers: {
          "svix-id": "event-1",
          "svix-timestamp": "1788343200",
          "svix-signature": "v1,bad",
        },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(recoveryOffers.recordResendEvent).not.toHaveBeenCalled();
  });
});
