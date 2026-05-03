import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_GATEWAY_CONFIGS,
} from "./default-gateway-configs";
import { PaymentGatewayService } from "./payment-gateway.service";

const mockPrisma = {
  paymentGatewayConfig: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig: Partial<ConfigService> = {
  get: jest.fn().mockReturnValue(undefined),
};

describe("PaymentGatewayService", () => {
  let service: PaymentGatewayService;

  async function buildService(configOverride?: Partial<ConfigService>) {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: configOverride || mockConfig,
        },
      ],
    }).compile();

    service = module.get(PaymentGatewayService);
  }

  beforeEach(async () => {
    await buildService();
  });

  describe("getGatewayConfigs()", () => {
    it("bootstraps default gateway rows when the config table is empty", async () => {
      mockPrisma.paymentGatewayConfig.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(DEFAULT_GATEWAY_CONFIGS.length);
      mockPrisma.paymentGatewayConfig.findFirst.mockResolvedValue(null);
      mockPrisma.paymentGatewayConfig.create.mockResolvedValue({});
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        { id: "gw-stripe", gatewayName: "stripe" },
      ]);

      const result = await service.getGatewayConfigs();

      expect(mockPrisma.paymentGatewayConfig.create).toHaveBeenCalledTimes(
        DEFAULT_GATEWAY_CONFIGS.length,
      );
      expect(result).toEqual([{ id: "gw-stripe", gatewayName: "stripe" }]);
    });
  });

  describe("selectGateway()", () => {
    it("bootstraps defaults and picks the first configured gateway for the country", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "PHONEPE_MERCHANT_ID") return "merchant-id";
          if (key === "PHONEPE_SALT_KEY") return "salt-key";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(DEFAULT_GATEWAY_CONFIGS.length);
      mockPrisma.paymentGatewayConfig.findFirst.mockResolvedValue(null);
      mockPrisma.paymentGatewayConfig.create.mockResolvedValue({});
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          gatewayName: "phonepe",
          isEnabled: true,
          priority: 10,
          supportedCountries: ["IN"],
        },
      ]);

      const gateway = await service.selectGateway("IN");

      expect(gateway).toBe("phonepe");
      expect(mockPrisma.paymentGatewayConfig.create).toHaveBeenCalledTimes(
        DEFAULT_GATEWAY_CONFIGS.length,
      );
    });

    it("keeps the local gateway ahead of Stripe for India", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "PHONEPE_MERCHANT_ID") return "merchant-id";
          if (key === "PHONEPE_SALT_KEY") return "salt-key";
          if (key === "STRIPE_SECRET_KEY") return "sk_live_test";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count.mockResolvedValue(1);
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          gatewayName: "phonepe",
          isEnabled: true,
          priority: 10,
          supportedCountries: ["IN"],
        },
      ]);

      const gateway = await service.selectGateway("IN");

      expect(gateway).toBe("phonepe");
    });

    it("uses Stripe as the primary configured gateway for the UK", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "STRIPE_SECRET_KEY") return "sk_live_test";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count.mockResolvedValue(1);
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          gatewayName: "stripe",
          isEnabled: true,
          priority: 8,
          supportedCountries: ["UK", "EU"],
        },
      ]);

      const gateway = await service.selectGateway("UK");

      expect(gateway).toBe("stripe");
    });

    it("falls back to Stripe outside UK and EU when no country gateway is configured", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "STRIPE_SECRET_KEY") return "sk_live_test";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count.mockResolvedValue(1);
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([]);
      mockPrisma.paymentGatewayConfig.findFirst.mockResolvedValue({
        gatewayName: "stripe",
        isEnabled: true,
        isDefault: true,
        priority: 8,
      });

      const gateway = await service.selectGateway("US");

      expect(gateway).toBe("stripe");
    });
  });

  describe("getAvailableGateways()", () => {
    it("includes Stripe in the India gateway list when Stripe is configured", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "PHONEPE_MERCHANT_ID") return "merchant-id";
          if (key === "PHONEPE_SALT_KEY") return "salt-key";
          if (key === "STRIPE_SECRET_KEY") return "sk_live_test";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count.mockResolvedValue(1);
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          gatewayName: "phonepe",
          displayName: "PhonePe",
          supportedMethods: ["UPI", "CARD", "PHONEPE"],
          commissionInfo: "local gateway",
          isDefault: false,
        },
        {
          gatewayName: "stripe",
          displayName: "Stripe",
          supportedMethods: ["CARD", "BANK_TRANSFER", "PAYPAL"],
          commissionInfo: "global gateway",
          isDefault: true,
        },
      ]);

      const gateways = await service.getAvailableGateways("IN");

      expect(gateways.map((gateway) => gateway.gatewayName)).toEqual([
        "phonepe",
        "stripe",
      ]);
    });

    it("returns Stripe as the fallback option for countries outside the explicit Stripe regions", async () => {
      await buildService({
        get: jest.fn((key: string) => {
          if (key === "STRIPE_SECRET_KEY") return "sk_live_test";
          return undefined;
        }),
      });

      mockPrisma.paymentGatewayConfig.count.mockResolvedValue(1);
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          gatewayName: "stripe",
          displayName: "Stripe",
          supportedMethods: ["CARD", "BANK_TRANSFER", "PAYPAL"],
          commissionInfo: "global gateway",
          isDefault: true,
        },
      ]);

      const gateways = await service.getAvailableGateways("US");

      expect(gateways.map((gateway) => gateway.gatewayName)).toEqual([
        "stripe",
      ]);
    });
  });
});