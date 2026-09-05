import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { SecurityService, ThreatType } from "./security.service";

describe("SecurityService request-body analysis", () => {
  const prisma = {
    blockedIp: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    whitelistedIp: { findMany: jest.fn().mockResolvedValue([]) },
    securityEvent: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  let service: SecurityService;
  const request = {
    ip: "192.0.2.10",
    method: "PUT",
    route: "/api/recovery-offers/admin/campaigns/demo/email-design",
    userAgent: "Mozilla/5.0",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SecurityService);
    jest.spyOn(service, "isWhitelisted").mockResolvedValue(false);
  });

  it.each([
    [
      "demo URL fragment",
      {
        emailSubject: "See it in action",
        blocks: [
          {
            type: "video",
            posterUrl: "https://www.orivraa.com/ai-photo-studio-demo.gif",
            videoUrl:
              "https://www.orivraa.com/jewellery-shop-software#ai-photo-studio",
          },
        ],
      },
    ],
    [
      "SQL words in separate fields",
      {
        emailSubject: "Product update",
        blocks: [
          { type: "text", text: "A walkthrough from catalog to customer." },
        ],
      },
    ],
    [
      "ordinary punctuation",
      {
        emailSubject: "What's new -- September",
        blocks: [{ type: "text", text: "#1 feature: preview your email;" }],
      },
    ],
  ])(
    "does not flag or eventually block repeated saves with %s",
    async (_name, body) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        await expect(
          service.analyzeRequest({ ...request, body }),
        ).resolves.toEqual({
          blocked: false,
          threats: [],
        });
      }
      expect(service.getIpProfile(request.ip)?.score).toBe(0);
      expect(prisma.blockedIp.upsert).not.toHaveBeenCalled();
      expect(prisma.securityEvent.createMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    "' OR 1=1 --",
    "1 UNION SELECT password FROM users",
    "SELECT\npassword\nFROM users",
    "'; DROP TABLE users; --",
    "admin'--",
    "admin'#",
    "admin'/*",
    "SELECT/**/password FROM users",
    "SLEEP(5)",
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "../../etc/passwd",
    "..\\..\\windows\\system.ini",
    "; curl https://example.com",
  ])("continues detecting nested attack payloads: %s", async (payload) => {
    const result = await service.analyzeRequest({
      ...request,
      body: { blocks: [{ type: "text", text: payload }] },
    });
    expect(result.threats).toEqual([
      expect.objectContaining({ type: ThreatType.INPUT_INJECTION }),
    ]);
  });

  it("retains detection and temporary blocking outside the email builder", async () => {
    const input = {
      ...request,
      method: "POST",
      route: "/api/auth/login",
      body: { email: "' OR 1=1 --" },
    };
    await service.analyzeRequest(input);
    await service.analyzeRequest(input);
    await expect(service.analyzeRequest(input)).resolves.toMatchObject({
      blocked: true,
    });
    expect(prisma.blockedIp.upsert).toHaveBeenCalled();
    await expect(service.isBlocked(request.ip)).resolves.toBe(true);
  });

  it("inspects JSON keys and plain string bodies", async () => {
    for (const body of [
      { "<script>alert(1)</script>": "text" },
      "' OR 1=1 --",
    ]) {
      const result = await service.analyzeRequest({ ...request, body });
      expect(result.threats).toEqual([
        expect.objectContaining({ type: ThreatType.INPUT_INJECTION }),
      ]);
    }
  });
});
