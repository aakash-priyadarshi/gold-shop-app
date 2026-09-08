import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { MessageDirection, MessageSender } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { FestivalCalendarService } from "../recovery-offers/festival-calendar.service";
import { LeadsAiBotService } from "./leads-ai-bot.service";
import { LeadsWhatsAppService } from "./leads-whatsapp.service";

describe("LeadsAiBotService", () => {
  let service: LeadsAiBotService;
  let prisma: any;
  let whatsAppService: any;
  let festivalCalendar: any;

  const mockLead: any = {
    id: "lead-789",
    shopName: "Shree Ganesh Jewellers",
    phone: "+9779812345678",
    email: "ganesh@jewels.com",
    city: "Kathmandu",
    country: "NP",
    whatsappOptOut: false,
    aiBotPaused: false,
  };

  beforeEach(async () => {
    prisma = {
      leadMessage: {
        findMany: jest.fn().mockResolvedValue([
          {
            direction: MessageDirection.INBOUND,
            body: "Hi, what does Orivraa do?",
          },
        ]),
      },
    };

    whatsAppService = {
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };

    festivalCalendar = {
      getCalendar: jest.fn().mockReturnValue({
        events: [
          {
            id: "tihar",
            name: "Tihar / Dhanteras",
            date: "2026-11-01",
            countries: ["NP", "IN"],
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsAiBotService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "GEMINI_API_KEY") return ""; // Mock fallback mode
              if (key === "FRONTEND_URL") return "https://www.orivraa.com";
              return null;
            }),
          },
        },
        { provide: FestivalCalendarService, useValue: festivalCalendar },
        { provide: LeadsWhatsAppService, useValue: whatsAppService },
      ],
    }).compile();

    service = module.get<LeadsAiBotService>(LeadsAiBotService);
  });

  it("generates fallback reply with 60-day claim link when Gemini key is empty", async () => {
    await service.generateAndSendReply(mockLead, "Tell me about pricing");

    expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
      "lead-789",
      expect.stringContaining("60-day complimentary PRO trial"),
      expect.objectContaining({
        sender: MessageSender.AI_BOT,
      })
    );

    expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
      "lead-789",
      expect.stringContaining("https://www.orivraa.com/auth/register?ref=lead_whatsapp"),
      expect.any(Object)
    );
  });
});
