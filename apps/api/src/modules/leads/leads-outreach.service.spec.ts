import { LeadStatus } from "@prisma/client";
import { LeadsOutreachService } from "./leads-outreach.service";

describe("LeadsOutreachService", () => {
  let service: LeadsOutreachService;
  let prisma: any;
  let mailService: any;
  let configService: any;
  let festivalService: any;

  beforeEach(() => {
    prisma = {
      lead: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    mailService = {
      sendHtml: jest.fn().mockResolvedValue({ success: true }),
    };
    configService = {
      get: jest.fn().mockReturnValue("https://www.orivraa.com"),
    };
    festivalService = {
      getCalendar: jest.fn().mockResolvedValue({
        events: [
          {
            name: "Dashain",
            date: "2026-10-15",
            countries: ["NP"],
          },
        ],
      }),
    };
    service = new LeadsOutreachService(
      prisma,
      mailService,
      configService,
      festivalService,
    );
  });

  describe("renderContent", () => {
    it("should correctly substitute merge tags", () => {
      const template = "Hello {{shopName}} in {{city}}, join us for {{festivalName}} with {{trialDays}} days free!";
      const lead = {
        id: "lead-1",
        shopName: "Priyadarshi Jewellers",
        city: "Kathmandu",
        country: "NP",
      };

      const rendered = service.renderContent(template, lead, "Dashain", 60);

      expect(rendered).toContain("Priyadarshi Jewellers");
      expect(rendered).toContain("Kathmandu");
      expect(rendered).toContain("Dashain");
      expect(rendered).toContain("60 days free");
    });
  });

  describe("generateClaimLink", () => {
    it("should generate a registration link with lead parameters and promo code", () => {
      const lead = {
        id: "lead-123",
        shopName: "Gold House",
        country: "NP",
        email: "shop@gold.com",
        city: "Patan",
      };

      const link = service.generateClaimLink(lead);

      expect(link).toContain("https://www.orivraa.com/auth/register");
      expect(link).toContain("ref=lead_outreach");
      expect(link).toContain("leadId=lead-123");
      expect(link).toContain("promo=FESTIVAL60");
      expect(link).toContain("shopName=Gold+House");
    });
  });

  describe("sendOutreach", () => {
    it("should send email to eligible leads and update status to CONTACTED", async () => {
      const leads = [
        {
          id: "l1",
          shopName: "Shop One",
          email: "one@test.com",
          city: "Kathmandu",
          country: "NP",
        },
        {
          id: "l2",
          shopName: "Shop Two",
          email: null,
          city: "Kathmandu",
          country: "NP",
        },
      ];

      prisma.lead.findMany.mockResolvedValue(leads);
      prisma.lead.update.mockResolvedValue({ id: "l1", status: LeadStatus.CONTACTED });

      const result = await service.sendOutreach({
        leadIds: ["l1", "l2"],
        campaignKey: "dashain-2026",
        subject: "Festive Offer for {{shopName}}",
        bodyTemplate: "Welcome to Orivraa",
        festivalName: "Dashain",
        offerTrialDays: 60,
      });

      expect(result.total).toBe(2);
      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mailService.sendHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "one@test.com",
          subject: "Festive Offer for Shop One",
        }),
      );
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "l1" },
          data: expect.objectContaining({
            status: LeadStatus.CONTACTED,
            lastCampaignKey: "dashain-2026",
          }),
        }),
      );
    });
  });
});
