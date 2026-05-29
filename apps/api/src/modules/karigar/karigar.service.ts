import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SaveKarigarStateDto } from "./dto/karigar.dto";

const BUILT_IN_VAULT: Record<string, string> = {
  goldGrains24k: "Gold Grains (24K)",
  goldBars24k: "Gold Cast Bars (24K)",
  silverBullion999: "Silver Bullion (999)",
};

@Injectable()
export class KarigarService {
  constructor(private prisma: PrismaService) {}

  /** Return the full karigar state for a shop in the shape the UI expects. */
  async getSnapshot(shopId: string) {
    const [workshops, jobs, reserves] = await Promise.all([
      this.prisma.karigarWorkshop.findMany({
        where: { shopId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.karigarJob.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.karigarVaultReserve.findMany({ where: { shopId } }),
    ]);

    const vaultReserves: Record<string, number> = {
      goldGrains24k: 0,
      goldBars24k: 0,
      silverBullion999: 0,
    };
    const customMaterials: Array<{
      key: string;
      label: string;
      vaultKey: string;
    }> = [];
    for (const r of reserves) {
      vaultReserves[r.materialKey] = r.quantity;
      if (r.isCustom && r.customKey) {
        customMaterials.push({
          key: r.customKey,
          label: r.label,
          vaultKey: r.materialKey,
        });
      }
    }

    return {
      vaultReserves,
      workshops: workshops.map((w) => ({
        id: w.id,
        name: w.name,
        artisan: w.artisan,
        location: w.location,
        phone: w.phone ?? undefined,
        email: w.email ?? undefined,
        rating: w.rating,
        metalIssued: w.metalIssued,
        metalReturned: w.metalReturned,
        wastagePercent: w.wastagePercent,
        wastageLimit: w.wastageLimit,
        wageRatePerGram: w.wageRatePerGram,
        outstandingBalance: w.outstandingBalance,
        wageDue: w.wageDue,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        product: j.product,
        artisan: j.artisan,
        grossWeight: j.grossWeight,
        status: j.status,
        steps: (j.steps as Record<string, unknown>) ?? undefined,
        updatedAt: j.updatedAt.toISOString(),
      })),
      customMaterials,
    };
  }

  /**
   * Replace the entire karigar state for a shop transactionally. The UI always
   * submits the full consistent state, so a transactional replace is correct
   * and atomic — no cross-feature lost updates like the old JSON-blob approach.
   */
  async replaceSnapshot(shopId: string, dto: SaveKarigarStateDto) {
    const customMaterials = dto.customMaterials ?? [];
    const customByVaultKey = new Map(
      customMaterials.map((m) => [m.vaultKey, m]),
    );

    const reserveKeys = new Set<string>([
      ...Object.keys(dto.vaultReserves ?? {}),
      ...customMaterials.map((m) => m.vaultKey),
    ]);

    const reserveRows = Array.from(reserveKeys).map((key) => {
      const cm = customByVaultKey.get(key);
      return {
        shopId,
        materialKey: key,
        quantity: Number(dto.vaultReserves?.[key] ?? 0) || 0,
        isCustom: !!cm,
        customKey: cm?.key ?? null,
        label: cm?.label ?? BUILT_IN_VAULT[key] ?? key,
      };
    });

    await this.prisma.$transaction([
      this.prisma.karigarWorkshop.deleteMany({ where: { shopId } }),
      this.prisma.karigarJob.deleteMany({ where: { shopId } }),
      this.prisma.karigarVaultReserve.deleteMany({ where: { shopId } }),
      this.prisma.karigarWorkshop.createMany({
        data: dto.workshops.map((w) => ({
          id: w.id,
          shopId,
          name: w.name,
          artisan: w.artisan,
          location: w.location ?? "Local",
          phone: w.phone ?? null,
          email: w.email ?? null,
          rating: w.rating ?? 5,
          metalIssued: w.metalIssued ?? 0,
          metalReturned: w.metalReturned ?? 0,
          wastagePercent: w.wastagePercent ?? 0,
          wastageLimit: w.wastageLimit ?? 1,
          wageRatePerGram: w.wageRatePerGram ?? 0,
          outstandingBalance: w.outstandingBalance ?? 0,
          wageDue: w.wageDue ?? 0,
        })),
      }),
      this.prisma.karigarJob.createMany({
        data: dto.jobs.map((j) => ({
          id: j.id,
          shopId,
          product: j.product,
          artisan: j.artisan,
          grossWeight: j.grossWeight ?? 0,
          status: j.status ?? "PENDING",
          steps: (j.steps as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        })),
      }),
      this.prisma.karigarVaultReserve.createMany({ data: reserveRows }),
    ]);

    return this.getSnapshot(shopId);
  }
}
