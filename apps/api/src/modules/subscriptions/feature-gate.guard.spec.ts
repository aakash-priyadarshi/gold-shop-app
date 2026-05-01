import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { RedisService } from "../../common/redis";
import { FeatureGateGuard } from "./feature-gate.guard";
import {
    FeatureNotEnabledException,
    PlanLimitsService,
} from "./plan-limits.service";

// ─── Helper: build a fake ExecutionContext ────────────────
function mockContext(user: Record<string, unknown> | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe("FeatureGateGuard", () => {
  let guard: FeatureGateGuard;
  let reflector: Reflector;
  let planLimits: { checkFeature: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    planLimits = { checkFeature: jest.fn() };
    redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureGateGuard,
        Reflector,
        { provide: PlanLimitsService, useValue: planLimits },
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("3") },
        },
      ],
    }).compile();

    guard = module.get(FeatureGateGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════
  // 1. No decorator → allow
  // ═══════════════════════════════════════════════════
  it("should ALLOW when no @RequireFeature decorator is present", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(planLimits.checkFeature).not.toHaveBeenCalled();
  });

  it("should ALLOW when @RequireFeature has empty array", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);
    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  // ═══════════════════════════════════════════════════
  // 2. Admin bypass
  // ═══════════════════════════════════════════════════
  it("should ALLOW admin users regardless of features", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["invoicing"]);
    const ctx = mockContext({ id: "admin1", role: "ADMIN" });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(planLimits.checkFeature).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════
  // 3. No user → throw
  // ═══════════════════════════════════════════════════
  it("should DENY when no user on request", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["invoicing"]);
    const ctx = mockContext(null);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // ═══════════════════════════════════════════════════
  // 4. No shopId → throw
  // ═══════════════════════════════════════════════════
  it("should DENY shopkeeper without shopId", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["invoicing"]);
    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER" }); // no shopId
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // ═══════════════════════════════════════════════════
  // 5. Feature enabled → allow
  // ═══════════════════════════════════════════════════
  it("should ALLOW when checkFeature passes for all required features", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(["crm", "invoicing"]);
    planLimits.checkFeature.mockResolvedValue(undefined); // no throw = pass

    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(planLimits.checkFeature).toHaveBeenCalledTimes(2);
    expect(planLimits.checkFeature).toHaveBeenCalledWith("s1", "crm");
    expect(planLimits.checkFeature).toHaveBeenCalledWith("s1", "invoicing");
  });

  // ═══════════════════════════════════════════════════
  // 6. Feature disabled → throw
  // ═══════════════════════════════════════════════════
  it("should DENY when checkFeature throws FeatureNotEnabledException", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["apiAccess"]);
    planLimits.checkFeature.mockRejectedValue(
      new FeatureNotEnabledException("apiAccess", "API Access", "Free Plan"),
    );

    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      FeatureNotEnabledException,
    );
  });

  it("should include feature metadata in the error response", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["multiBranch"]);
    planLimits.checkFeature.mockRejectedValue(
      new FeatureNotEnabledException(
        "multiBranch",
        "Multi-branch support",
        "Pro Plan",
      ),
    );

    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    try {
      await guard.canActivate(ctx);
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FeatureNotEnabledException);
      const resp = (err as FeatureNotEnabledException).getResponse() as Record<
        string,
        unknown
      >;
      expect(resp.error).toBe("FEATURE_NOT_ENABLED");
      expect(resp.featureKey).toBe("multiBranch");
      expect(resp.planName).toBe("Pro Plan");
    }
  });

  // ═══════════════════════════════════════════════════
  // 7. Multiple features — first failure stops chain
  // ═══════════════════════════════════════════════════
  it("should stop checking at first failing feature", async () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(["crm", "invoicing"]);
    planLimits.checkFeature
      .mockResolvedValueOnce(undefined) // crm passes
      .mockRejectedValueOnce(
        // invoicing fails
        new FeatureNotEnabledException(
          "invoicing",
          "Invoicing & billing",
          "Free Plan",
        ),
      );

    const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      FeatureNotEnabledException,
    );
    expect(planLimits.checkFeature).toHaveBeenCalledTimes(2);
  });

  // ═══════════════════════════════════════════════════
  // 8. All 15 enforced features are testable
  // ═══════════════════════════════════════════════════
  const enforcedFeatures = [
    "purchasableAiCredits",
    "aiDesignGeneration",
    "multiBranch",
    "staffAccounts",
    "apiAccess",
    "webhookSubscriptions",
    "customBranding",
    "scheduledReports",
    "bulkUpload",
    "aiPriceOptimization",
    "demandForecasting",
    "crm",
    "invoicing",
  ];

  it.each(enforcedFeatures)(
    "should gate feature '%s' through checkFeature()",
    async (featureKey) => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([featureKey]);
      planLimits.checkFeature.mockResolvedValue(undefined);

      const ctx = mockContext({ id: "u1", role: "SHOPKEEPER", shopId: "s1" });
      await guard.canActivate(ctx);
      expect(planLimits.checkFeature).toHaveBeenCalledWith("s1", featureKey);
    },
  );
});
