import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InventoryStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InventoryService } from "./inventory.service";

@Injectable()
export class StockAuditService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  private async assertShopOwner(shopId: string, userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
      select: { id: true },
    });
    if (!shop) {
      throw new ForbiddenException("You can only manage your own shop");
    }
  }

  async start(shopId: string, userId: string, notes?: string) {
    await this.assertShopOwner(shopId, userId);

    const existing = await this.prisma.stockAudit.findFirst({
      where: { shopId, status: "IN_PROGRESS" },
    });
    if (existing) {
      return this.get(shopId, userId, existing.id);
    }

    const audit = await this.prisma.stockAudit.create({
      data: {
        shopId,
        startedByUserId: userId,
        notes: notes?.trim() || null,
        status: "IN_PROGRESS",
      },
    });

    return this.get(shopId, userId, audit.id);
  }

  async list(shopId: string, userId: string) {
    await this.assertShopOwner(shopId, userId);
    return this.prisma.stockAudit.findMany({
      where: { shopId },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { _count: { select: { scans: true } } },
    });
  }

  async get(shopId: string, userId: string, auditId: string) {
    await this.assertShopOwner(shopId, userId);
    const audit = await this.prisma.stockAudit.findFirst({
      where: { id: auditId, shopId },
      include: {
        scans: {
          orderBy: { scannedAt: "desc" },
          take: 500,
          include: {
            inventoryItem: {
              select: {
                id: true,
                sku: true,
                nameEn: true,
                hallmarkNumber: true,
                status: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
    });
    if (!audit) {
      throw new NotFoundException("Stock audit not found");
    }
    return audit;
  }

  async scan(shopId: string, userId: string, auditId: string, code: string) {
    await this.assertShopOwner(shopId, userId);
    const trimmed = code?.trim();
    if (!trimmed) {
      throw new BadRequestException("Scan code is required");
    }

    const audit = await this.prisma.stockAudit.findFirst({
      where: { id: auditId, shopId },
    });
    if (!audit) {
      throw new NotFoundException("Stock audit not found");
    }
    if (audit.status !== "IN_PROGRESS") {
      throw new BadRequestException("Audit is not in progress");
    }

    const lookup = await this.inventoryService.findByCode(shopId, trimmed);
    const item = lookup?.item ?? null;

    const scan = await this.prisma.stockAuditScan.create({
      data: {
        auditId,
        code: trimmed,
        inventoryItemId: item?.id ?? null,
        matched: !!item,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            sku: true,
            nameEn: true,
            hallmarkNumber: true,
            status: true,
            stockQuantity: true,
          },
        },
      },
    });

    return scan;
  }

  async complete(shopId: string, userId: string, auditId: string) {
    await this.assertShopOwner(shopId, userId);

    const audit = await this.prisma.stockAudit.findFirst({
      where: { id: auditId, shopId },
      include: { scans: true },
    });
    if (!audit) {
      throw new NotFoundException("Stock audit not found");
    }
    if (audit.status !== "IN_PROGRESS") {
      throw new BadRequestException("Audit is not in progress");
    }

    const expectedItems = await this.prisma.inventoryItem.findMany({
      where: {
        shopId,
        status: { in: [InventoryStatus.AVAILABLE, InventoryStatus.RESERVED] },
      },
      select: { id: true, sku: true, nameEn: true, stockQuantity: true },
    });

    const matchedIds = new Set(
      audit.scans
        .filter((s) => s.matched && s.inventoryItemId)
        .map((s) => s.inventoryItemId as string),
    );

    const missing = expectedItems.filter((i) => !matchedIds.has(i.id));
    const unmatchedScans = audit.scans.filter((s) => !s.matched).length;

    const summary = {
      expectedCount: expectedItems.length,
      scannedUnique: matchedIds.size,
      matchedCount: matchedIds.size,
      missingCount: missing.length,
      unmatchedScans,
      missingItems: missing.slice(0, 200),
    };

    return this.prisma.stockAudit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        summary,
      },
      include: {
        scans: {
          orderBy: { scannedAt: "desc" },
          take: 100,
        },
      },
    });
  }

  async cancel(shopId: string, userId: string, auditId: string) {
    await this.assertShopOwner(shopId, userId);
    const audit = await this.prisma.stockAudit.findFirst({
      where: { id: auditId, shopId },
    });
    if (!audit) {
      throw new NotFoundException("Stock audit not found");
    }
    if (audit.status !== "IN_PROGRESS") {
      throw new BadRequestException("Audit is not in progress");
    }
    return this.prisma.stockAudit.update({
      where: { id: auditId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
  }
}
