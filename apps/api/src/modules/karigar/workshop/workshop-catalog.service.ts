import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkshopScalePurpose } from "@prisma/client";
import { assertPositiveQuantumGrams, WORKSHOP_GOLD_995_MATERIAL_KEY } from "@gold-shop/shared";
import { isIP } from "node:net";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  CreateWorkshopDeviceDto, CreateWorkshopMaterialDto, CreateWorkshopProcessDto,
  CreateWorkshopRecipeDto, CreateWorkshopRouteDto, CreateWorkshopToleranceDto,
  CreateWorkshopWorkstationDto,
} from "./dto/workshop-catalog.dto";

const GOLD_995 = new Prisma.Decimal("0.995");
const BASE_MATERIALS = [
  { key: WORKSHOP_GOLD_995_MATERIAL_KEY, name: "Gold 995", kind: "GOLD", scalePurpose: WorkshopScalePurpose.GOLD, theoreticalPurity: GOLD_995 },
  { key: "masterAlloy", name: "Master Alloy", kind: "ALLOY", scalePurpose: WorkshopScalePurpose.GOLD, theoreticalPurity: null },
];

@Injectable()
export class WorkshopCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureBaseMaterials(shopId: string) {
    for (const material of BASE_MATERIALS) {
      await this.prisma.workshopMaterial.upsert({
        where: { shopId_key: { shopId, key: material.key } },
        update: {},
        create: { shopId, ...material },
      });
    }
  }

  async list(shopId: string) {
    await this.ensureBaseMaterials(shopId);
    const [materials, recipes, devices, processes, routes, workstations, tolerances] = await Promise.all([
      this.prisma.workshopMaterial.findMany({ where: { shopId }, orderBy: { name: "asc" }, include: { assays: { orderBy: { assayedAt: "desc" }, take: 1 } } }),
      this.prisma.workshopAlloyRecipe.findMany({ where: { shopId }, orderBy: [{ name: "asc" }, { version: "desc" }] }),
      this.prisma.workshopScaleDevice.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
      this.prisma.workshopProcessDefinition.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
      this.prisma.workshopRouteTemplate.findMany({ where: { shopId }, include: { steps: { orderBy: { position: "asc" }, include: { definition: true } } }, orderBy: { name: "asc" } }),
      this.prisma.workshopWorkstation.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
      this.prisma.workshopToleranceRule.findMany({ where: { shopId }, orderBy: { movementKind: "asc" } }),
    ]);
    return {
      materials: materials.map((m) => ({ ...m, theoreticalPurity: m.theoreticalPurity?.toFixed(6) ?? null, effectivePurity: m.assays[0]?.fineGoldFraction.toFixed(6) ?? m.theoreticalPurity?.toFixed(6) ?? null })),
      recipes: recipes.map((r) => ({ ...r, targetFineGoldFraction: r.targetFineGoldFraction.toFixed(6), alloyFineGoldFraction: r.alloyFineGoldFraction.toFixed(6) })),
      devices: devices.map((d) => ({ ...d, precisionGrams: d.precisionGrams.toFixed(6) })),
      processes, routes, workstations,
      tolerances: tolerances.map((r) => ({ ...r, maxDifferenceGrams: r.maxDifferenceGrams.toFixed(6) })),
      recommendedPurities: [
        { label: "22K", fraction: new Prisma.Decimal(22).div(24).toFixed(6) },
        { label: "21K", fraction: new Prisma.Decimal(21).div(24).toFixed(6) },
        { label: "18K", fraction: new Prisma.Decimal(18).div(24).toFixed(6) },
      ],
    };
  }

  async createMaterial(shopId: string, userId: string, dto: CreateWorkshopMaterialDto) {
    if (dto.key === WORKSHOP_GOLD_995_MATERIAL_KEY || dto.key === "masterAlloy") {
      throw new BadRequestException("Built-in material identity cannot be replaced");
    }
    if ((dto.kind === "DIAMOND" || dto.kind === "STONE") !== (dto.scalePurpose === "STONE")) {
      throw new BadRequestException("Diamonds and stones require a Stone Scale; metal requires a Gold Scale");
    }
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.workshopMaterial.create({
        data: {
          shopId, key: dto.key, name: dto.name.trim(), kind: dto.kind,
          scalePurpose: dto.scalePurpose,
          theoreticalPurity: dto.theoreticalPurity ? new Prisma.Decimal(dto.theoreticalPurity) : null,
          composition: dto.composition as Prisma.InputJsonValue | undefined,
          createdByUserId: userId,
        },
      });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_MATERIAL_CREATE", resourceType: "WorkshopMaterial", resourceId: material.id, newValue: { shopId, key: material.key, kind: material.kind } } });
      return material;
    });
  }

  async createRecipe(shopId: string, userId: string, dto: CreateWorkshopRecipeDto) {
    const target = new Prisma.Decimal(dto.targetFineGoldFraction);
    const alloy = new Prisma.Decimal(dto.alloyFineGoldFraction);
    if (target.lte(0) || target.gte(GOLD_995) || alloy.lt(0) || alloy.gte(target)) {
      throw new BadRequestException("Target purity must be between alloy purity and Gold 995 purity");
    }
    const sum = dto.components.reduce((acc, item) => acc.plus(item.fraction), new Prisma.Decimal(0));
    if (!sum.eq(1)) throw new BadRequestException("Alloy component fractions must sum to 1.000000");
    const keys = dto.components.map((item) => item.materialKey);
    if (new Set(keys).size !== keys.length) throw new BadRequestException("Duplicate alloy component");
    const materials = await this.prisma.workshopMaterial.findMany({ where: { shopId, key: { in: keys }, isActive: true } });
    if (materials.length !== keys.length || materials.some((m) => m.scalePurpose !== WorkshopScalePurpose.GOLD)) {
      throw new BadRequestException("Every alloy component must be an active Gold Scale material in this shop");
    }
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.workshopAlloyRecipe.findFirst({ where: { shopId, name: dto.name }, orderBy: { version: "desc" } });
      if (previous) await tx.workshopAlloyRecipe.updateMany({ where: { shopId, name: dto.name, isActive: true }, data: { isActive: false } });
      const recipe = await tx.workshopAlloyRecipe.create({ data: {
        shopId, name: dto.name.trim(), version: (previous?.version ?? 0) + 1,
        targetFineGoldFraction: target, alloyFineGoldFraction: alloy,
        components: dto.components as unknown as Prisma.InputJsonValue,
        createdByUserId: userId,
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_RECIPE_CREATE", resourceType: "WorkshopAlloyRecipe", resourceId: recipe.id, newValue: { shopId, name: recipe.name, version: recipe.version } } });
      return recipe;
    });
  }

  async recommend(shopId: string, recipeId: string, targetWeightGrams: string) {
    const recipe = await this.prisma.workshopAlloyRecipe.findFirst({ where: { id: recipeId, shopId, isActive: true } });
    if (!recipe) throw new NotFoundException("Active workshop recipe not found");
    try { assertPositiveQuantumGrams(targetWeightGrams, "GOLD"); }
    catch (err) { throw new BadRequestException(err instanceof Error ? err.message : "Invalid target weight"); }
    const target = new Prisma.Decimal(targetWeightGrams);
    const rawGold = target.mul(recipe.targetFineGoldFraction.minus(recipe.alloyFineGoldFraction)).div(GOLD_995.minus(recipe.alloyFineGoldFraction));
    const gold = rawGold.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const masterAlloy = target.minus(gold);
    if (gold.lte(0) || masterAlloy.lt(0)) throw new BadRequestException("Recipe recommendation is outside physical range");
    return {
      recipeId, targetWeightGrams: target.toFixed(6),
      recommendedGold995Grams: gold.toFixed(6),
      recommendedMasterAlloyGrams: masterAlloy.toFixed(6),
      targetFineGoldFraction: recipe.targetFineGoldFraction.toFixed(6),
      alloyFineGoldFraction: recipe.alloyFineGoldFraction.toFixed(6),
      referenceOnly: true,
    };
  }

  async registerDevice(shopId: string, userId: string, dto: CreateWorkshopDeviceDto) {
    const profile = this.validateProfile(dto.adapterKind, dto.profile);
    const precision = dto.purpose === "GOLD" ? "0.01" : "0.001";
    return this.prisma.$transaction(async (tx) => {
      const device = await tx.workshopScaleDevice.create({ data: {
        shopId, name: dto.name.trim(), purpose: dto.purpose, adapterKind: dto.adapterKind,
        precisionGrams: new Prisma.Decimal(precision), profile: profile as Prisma.InputJsonValue,
      } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_DEVICE_REGISTER", resourceType: "WorkshopScaleDevice", resourceId: device.id, newValue: { shopId, name: device.name, purpose: device.purpose, adapterKind: device.adapterKind } } });
      return { ...device, precisionGrams: device.precisionGrams.toFixed(6) };
    });
  }

  private validateProfile(kind: "SERIAL" | "TCP", raw: Record<string, unknown>) {
    const parser = raw.parser;
    if (!parser || typeof parser !== "object" || Array.isArray(parser)) throw new BadRequestException("Scale parser profile is required");
    const parsed = parser as Record<string, unknown>;
    if (parsed.kind !== "ASCII_LINE" || typeof parsed.stableToken !== "string" || !parsed.stableToken.trim() ||
        typeof parsed.unstableToken !== "string" || !parsed.unstableToken.trim() ||
        parsed.stableToken === parsed.unstableToken ||
        String(parsed.stableToken).length > 16 || String(parsed.unstableToken).length > 16) {
      throw new BadRequestException("Use an ASCII line parser with distinct explicit stable/unstable tokens");
    }
    const transport = raw.transport;
    if (!transport || typeof transport !== "object" || Array.isArray(transport)) throw new BadRequestException("Scale transport profile is required");
    const config = transport as Record<string, unknown>;
    if (kind === "SERIAL") {
      if (typeof config.port !== "string" || !config.port.trim() || config.port.length > 256 ||
          !Number.isInteger(config.baudRate) || Number(config.baudRate) < 300 || Number(config.baudRate) > 115200 ||
          ![7, 8].includes(Number(config.dataBits)) || ![1, 2].includes(Number(config.stopBits)) ||
          !["none", "even", "odd"].includes(String(config.parity))) {
        throw new BadRequestException("Invalid serial baud/data bits/stop bits/parity");
      }
      return { parser: { kind: "ASCII_LINE", stableToken: parsed.stableToken, unstableToken: parsed.unstableToken }, transport: { port: config.port.trim(), baudRate: config.baudRate, dataBits: config.dataBits, stopBits: config.stopBits, parity: config.parity } };
    }
    const host = String(config.host ?? "");
    const privateIp = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;
    if (isIP(host) !== 4 || !privateIp.test(host) || !Number.isInteger(config.port) || Number(config.port) < 1 || Number(config.port) > 65535) {
      throw new BadRequestException("TCP scales must use a private LAN IPv4 address and valid port");
    }
    return { parser: { kind: "ASCII_LINE", stableToken: parsed.stableToken, unstableToken: parsed.unstableToken }, transport: { host, port: config.port } };
  }

  async createProcess(shopId: string, userId: string, dto: CreateWorkshopProcessDto) {
    return this.prisma.$transaction(async (tx) => {
      const process = await tx.workshopProcessDefinition.create({ data: { shopId, name: dto.name.trim(), department: dto.department?.trim() || null } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_PROCESS_CREATE", resourceType: "WorkshopProcessDefinition", resourceId: process.id, newValue: { shopId, name: process.name } } });
      return process;
    });
  }

  async createRoute(shopId: string, userId: string, dto: CreateWorkshopRouteDto) {
    const definitions = await this.prisma.workshopProcessDefinition.findMany({ where: { shopId, id: { in: dto.definitionIds }, isActive: true } });
    if (definitions.length !== new Set(dto.definitionIds).size) throw new BadRequestException("Route contains an inactive or foreign process");
    return this.prisma.$transaction(async (tx) => {
      const route = await tx.workshopRouteTemplate.create({ data: {
        shopId, name: dto.name.trim(), steps: { create: dto.definitionIds.map((definitionId, position) => ({ shopId, definitionId, position })) },
      }, include: { steps: { orderBy: { position: "asc" } } } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_ROUTE_CREATE", resourceType: "WorkshopRouteTemplate", resourceId: route.id, newValue: { shopId, name: route.name, definitionIds: dto.definitionIds } } });
      return route;
    });
  }

  async createWorkstation(shopId: string, userId: string, dto: CreateWorkshopWorkstationDto) {
    if (dto.definitionId) {
      const process = await this.prisma.workshopProcessDefinition.findFirst({ where: { id: dto.definitionId, shopId, isActive: true } });
      if (!process) throw new BadRequestException("Workstation process is not active in this shop");
    }
    return this.prisma.$transaction(async (tx) => {
      const workstation = await tx.workshopWorkstation.create({ data: { shopId, name: dto.name.trim(), department: dto.department?.trim() || null, definitionId: dto.definitionId || null } });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_WORKSTATION_CREATE", resourceType: "WorkshopWorkstation", resourceId: workstation.id, newValue: { shopId, name: workstation.name } } });
      return workstation;
    });
  }

  async configureTolerance(shopId: string, userId: string, dto: CreateWorkshopToleranceDto) {
    const value = new Prisma.Decimal(dto.maxDifferenceGrams);
    if (value.lt(0)) throw new BadRequestException("Tolerance cannot be negative");
    if (dto.materialKey) {
      const material = await this.prisma.workshopMaterial.findUnique({ where: { shopId_key: { shopId, key: dto.materialKey } } });
      if (!material || material.scalePurpose !== dto.scalePurpose) throw new BadRequestException("Tolerance material/scale mismatch");
    }
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.workshopToleranceRule.upsert({
        where: { shopId_movementKind_materialKey_scalePurpose: { shopId, movementKind: dto.movementKind, materialKey: dto.materialKey ?? "", scalePurpose: dto.scalePurpose } },
        update: { maxDifferenceGrams: value, isActive: dto.isActive ?? true },
        create: { shopId, movementKind: dto.movementKind, materialKey: dto.materialKey ?? "", scalePurpose: dto.scalePurpose, maxDifferenceGrams: value, isActive: dto.isActive ?? true, createdByUserId: userId },
      });
      await tx.auditLog.create({ data: { userId, actorType: "SHOPKEEPER", action: "WORKSHOP_TOLERANCE_CONFIGURE", resourceType: "WorkshopToleranceRule", resourceId: rule.id, newValue: { shopId, movementKind: rule.movementKind, maxDifferenceGrams: rule.maxDifferenceGrams.toFixed(6) } } });
      return { ...rule, maxDifferenceGrams: rule.maxDifferenceGrams.toFixed(6) };
    });
  }
}
