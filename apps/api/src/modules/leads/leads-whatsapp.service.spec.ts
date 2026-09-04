import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { MessageDirection, MessageSender } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import axios from "axios";
import { LeadsAiBotService } from "./leads-ai-bot.service";
import {
  LeadsWhatsAppService,
  normalizeWhatsAppNumber,
} from "./leads-whatsapp.service";

describe("LeadsWhatsAppService", () => {
  let service: LeadsWhatsAppService;
  let prisma: any;
  let aiBotService: any;

  const mockLead = {
    id: "lead-123",
    shopName: "Everest Gold House",
    phone: "9812345678",
    country: "NP",
    whatsappOptOut: false,
    aiBotPaused: false,
    customerServiceWindowExpiresAt: null,
  };

  beforeEach(async () => {
    jest.spyOn(axios, "post").mockResolvedValue({
      data: { sid: "SM_mock_123" },
    } as any);

    prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue(mockLead),
        findFirst: jest.fn().mockResolvedValue(mockLead),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: "new-lead", ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...mockLead, ...args.data })),
      },
      leadMessage: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: "msg-123", ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    aiBotService = {
      generateAndSendReply: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsWhatsAppService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "TWILIO_ACCOUNT_SID") return "ACtest";
              if (key === "TWILIO_AUTH_TOKEN") return "token123";
              if (key === "TWILIO_PHONE_NUMBER") return "+447123456789";
              return null;
            }),
          },
        },
        { provide: LeadsAiBotService, useValue: aiBotService },
      ],
    }).compile();

    service = module.get<LeadsWhatsAppService>(LeadsWhatsAppService);
  });

  describe("normalizeWhatsAppNumber", () => {
    it("normalizes Nepal numbers", () => {
      expect(normalizeWhatsAppNumber("9812345678", "NP")).toBe("+9779812345678");
      expect(normalizeWhatsAppNumber("+977-9812345678", "NP")).toBe("+9779812345678");
    });

    it("normalizes India numbers", () => {
      expect(normalizeWhatsAppNumber("9876543210", "IN")).toBe("+919876543210");
    });

    it("normalizes UAE numbers", () => {
      expect(normalizeWhatsAppNumber("501234567", "AE")).toBe("+971501234567");
    });

    it("normalizes UK numbers", () => {
      expect(normalizeWhatsAppNumber("7123456789", "UK")).toBe("+447123456789");
    });
  });

  describe("sendMessage", () => {
    it("creates an outbound LeadMessage with correct sender and direction", async () => {
      const result = await service.sendMessage("lead-123", "Hello from Orivraa", {
        sender: MessageSender.ADMIN,
      });

      expect(result.success).toBe(true);
      expect(prisma.leadMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: "lead-123",
            direction: MessageDirection.OUTBOUND,
            sender: MessageSender.ADMIN,
            body: "Hello from Orivraa",
          }),
        })
      );
    });

    it("skips send if lead has opted out", async () => {
      prisma.lead.findUnique.mockResolvedValueOnce({
        ...mockLead,
        whatsappOptOut: true,
      });

      const result = await service.sendMessage("lead-123", "Hello");
      expect(result.skipped).toBe(true);
      expect(prisma.leadMessage.create).not.toHaveBeenCalled();
    });
  });

  describe("handleIncomingWebhook", () => {
    it("handles incoming message, extends customer service window, and dispatches to AI bot", async () => {
      const payload = {
        From: "whatsapp:+9779812345678",
        Body: "Can I know the pricing for jewellery billing?",
        MessageSid: "SM12345",
      };

      const res = await service.handleIncomingWebhook(payload);
      expect(res.received).toBe(true);

      // Verify customer service window was set to 24h in the future
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerServiceWindowExpiresAt: expect.any(Date),
            whatsappOptOut: false,
          }),
        })
      );

      // Verify AI bot was triggered
      expect(aiBotService.generateAndSendReply).toHaveBeenCalled();
    });

    it("handles STOP keyword for automatic opt-out with stateful persistence and confirmation", async () => {
      let currentLeadState = { ...mockLead, whatsappOptOut: false };
      prisma.lead.findUnique.mockImplementation(() => Promise.resolve(currentLeadState));
      prisma.lead.findFirst.mockImplementation(() => Promise.resolve(currentLeadState));
      prisma.lead.update.mockImplementation((args: any) => {
        currentLeadState = { ...currentLeadState, ...args.data };
        return Promise.resolve(currentLeadState);
      });

      const payload = {
        From: "whatsapp:+9779812345678",
        Body: "STOP",
        MessageSid: "SM99999",
      };

      const res = await service.handleIncomingWebhook(payload);
      expect(res.optOut).toBe(true);
      expect(currentLeadState.whatsappOptOut).toBe(true);

      // Verify transactional confirmation was created before/with opt-out
      expect(prisma.leadMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: "lead-123",
            direction: MessageDirection.OUTBOUND,
            sender: MessageSender.SYSTEM,
            body: expect.stringContaining("unsubscribed"),
          }),
        })
      );
      expect(aiBotService.generateAndSendReply).not.toHaveBeenCalled();
    });

    it("skips duplicate webhook replay when twilioMessageSid already exists", async () => {
      prisma.leadMessage.findUnique = jest.fn().mockResolvedValueOnce({
        id: "msg-existing",
        twilioMessageSid: "SM_existing_123",
      });

      const payload = {
        From: "whatsapp:+9779812345678",
        Body: "Hello",
        MessageSid: "SM_existing_123",
      };

      const res = await service.handleIncomingWebhook(payload);
      expect(res.duplicate).toBe(true);
      expect(res.received).toBe(true);
      expect(aiBotService.generateAndSendReply).not.toHaveBeenCalled();
    });

    it("re-enables messaging on explicit START opt-in keyword", async () => {
      const optedOutLead = { ...mockLead, whatsappOptOut: true };
      prisma.lead.findFirst.mockResolvedValue(optedOutLead);
      prisma.lead.findUnique.mockResolvedValue(optedOutLead);

      const payload = {
        From: "whatsapp:+9779812345678",
        Body: "START",
        MessageSid: "SM_start_123",
      };

      const res = await service.handleIncomingWebhook(payload);
      expect(res.optIn).toBe(true);
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatsappOptOut: false,
          }),
        })
      );
    });

    it("preserves opt-out state when an opted-out lead sends a regular message and does not invoke AI bot", async () => {
      const optedOutLead = { ...mockLead, whatsappOptOut: true };
      prisma.lead.findFirst.mockResolvedValue(optedOutLead);
      prisma.lead.findUnique.mockResolvedValue(optedOutLead);

      const payload = {
        From: "whatsapp:+9779812345678",
        Body: "Wrong number, stop contacting me",
        MessageSid: "SM_wrong_123",
      };

      const res = await service.handleIncomingWebhook(payload);
      expect(res.optedOut).toBe(true);
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatsappOptOut: true,
          }),
        })
      );
      expect(aiBotService.generateAndSendReply).not.toHaveBeenCalled();
    });
  });

  describe("validateWebhookSignature", () => {
    it("returns true when token is unconfigured (development mode)", () => {
      const devService = new LeadsWhatsAppService(
        prisma,
        { get: jest.fn().mockReturnValue(null) } as any,
        aiBotService
      );
      expect(devService.validateWebhookSignature("", "http://localhost", {})).toBe(true);
    });

    it("rejects when signature is missing but token is configured", () => {
      expect(service.validateWebhookSignature("", "http://localhost", {})).toBe(false);
    });
  });
});
