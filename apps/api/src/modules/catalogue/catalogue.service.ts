import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CatalogueMode, InventoryVisibility } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AddCatalogueItemDto } from "./dto/add-item.dto";
import { CreateCatalogueDto } from "./dto/create-catalogue.dto";
import { ReorderItemsDto } from "./dto/reorder-items.dto";
import { UpdateCatalogueDto } from "./dto/update-catalogue.dto";
import {
  createCatalogueToken,
  hashViewerIp,
  verifyCatalogueToken,
} from "./catalogue.token";

@Injectable()
export class CatalogueService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Slug Generation ───────────────────────────────────────────────
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 40);
    const suffix = Math.random().toString(36).substring(2, 7);
    return `${base}-${suffix}`;
  }

  // ─── Seller CRUD ───────────────────────────────────────────────────

  async create(shopId: string, userId: string, dto: CreateCatalogueDto) {
    let slug = this.generateSlug(dto.name);
    // Ensure unique slug
    const existing = await this.prisma.catalogue.findUnique({ where: { slug } });
    if (existing) {
      slug = this.generateSlug(dto.name + "-" + Date.now());
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const catalogue = await this.prisma.catalogue.create({
      data: {
        shopId,
        name: dto.name,
        slug,
        description: dto.description,
        isPublic: dto.isPublic ?? true,
        mode: dto.mode as CatalogueMode,
        passwordHash,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "CREATE",
      resourceType: "CATALOGUE",
      resourceId: catalogue.id,
      newValue: { name: dto.name, mode: dto.mode, slug },
    });

    return catalogue;
  }

  async findAllForShop(shopId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [catalogues, total] = await Promise.all([
      this.prisma.catalogue.findMany({
        where: { shopId, deletedAt: null },
        include: {
          _count: { select: { items: true, viewEvents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.catalogue.count({ where: { shopId, deletedAt: null } }),
    ]);

    return {
      data: catalogues,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneForShop(id: string, shopId: string) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id, shopId, deletedAt: null },
      include: {
        items: {
          where: {},
          orderBy: { sortOrder: "asc" },
          include: {
            inventoryItem: {
              select: {
                id: true,
                title: true,
                titleNe: true,
                metal: true,
                purity: true,
                images: true,
                totalPriceNpr: true,
                status: true,
                visibility: true,
                variants: {
                  select: {
                    id: true,
                    size: true,
                    stock: true,
                    additionalPriceNpr: true,
                  },
                },
              },
            },
          },
        },
        _count: { select: { viewEvents: true } },
      },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");
    return catalogue;
  }

  async update(id: string, shopId: string, userId: string, dto: UpdateCatalogueDto) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.mode !== undefined) updateData.mode = dto.mode as CatalogueMode;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.password !== undefined) {
      if (dto.password === "") {
        updateData.passwordHash = null;
      } else {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10);
      }
    }

    const updated = await this.prisma.catalogue.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "CATALOGUE",
      resourceId: id,
      newValue: updateData,
    });

    return updated;
  }

  async softDelete(id: string, shopId: string, userId: string) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");

    await this.prisma.catalogue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "DELETE",
      resourceType: "CATALOGUE",
      resourceId: id,
      newValue: { softDeleted: true },
    });

    return { success: true };
  }

  // ─── Items Management ──────────────────────────────────────────────

  async addItem(catalogueId: string, shopId: string, userId: string, dto: AddCatalogueItemDto) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id: catalogueId, shopId, deletedAt: null },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");

    // Verify inventory item belongs to shop and is not HIDDEN
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, shopId },
    });
    if (!inventoryItem) {
      throw new BadRequestException("Inventory item not found or does not belong to your shop");
    }
    if (inventoryItem.visibility === InventoryVisibility.HIDDEN) {
      throw new BadRequestException("Cannot add a hidden inventory item to a catalogue");
    }

    // Check for duplicate
    const existingItem = await this.prisma.catalogueItem.findFirst({
      where: { catalogueId, inventoryItemId: dto.inventoryItemId },
    });
    if (existingItem) {
      throw new ConflictException("Item already exists in this catalogue");
    }

    const item = await this.prisma.catalogueItem.create({
      data: {
        catalogueId,
        inventoryItemId: dto.inventoryItemId,
        sortOrder: dto.sortOrder ?? 0,
        overridePrice: dto.overridePrice,
        isHidden: dto.isHidden ?? false,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            title: true,
            metal: true,
            purity: true,
            images: true,
            totalPriceNpr: true,
          },
        },
      },
    });

    return item;
  }

  async updateItem(
    catalogueId: string,
    itemId: string,
    shopId: string,
    data: { sortOrder?: number; overridePrice?: number | null; isHidden?: boolean },
  ) {
    const item = await this.prisma.catalogueItem.findFirst({
      where: { id: itemId, catalogueId, catalogue: { shopId, deletedAt: null } },
    });
    if (!item) throw new NotFoundException("Catalogue item not found");

    return this.prisma.catalogueItem.update({
      where: { id: itemId },
      data: {
        sortOrder: data.sortOrder,
        overridePrice: data.overridePrice,
        isHidden: data.isHidden,
      },
    });
  }

  async removeItem(catalogueId: string, itemId: string, shopId: string) {
    const item = await this.prisma.catalogueItem.findFirst({
      where: { id: itemId, catalogueId, catalogue: { shopId, deletedAt: null } },
    });
    if (!item) throw new NotFoundException("Catalogue item not found");

    await this.prisma.catalogueItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async reorderItems(catalogueId: string, shopId: string, dto: ReorderItemsDto) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id: catalogueId, shopId, deletedAt: null },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.catalogueItem.updateMany({
          where: { id: item.itemId, catalogueId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { success: true };
  }

  // ─── Public Access ─────────────────────────────────────────────────

  async getPublicCatalogueBySlug(slug: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
      include: {
        shop: {
          select: {
            id: true,
            shopName: true,
            shopNameNe: true,
            logo: true,
            city: true,
          },
        },
      },
    });

    if (!catalogue || catalogue.deletedAt) {
      throw new NotFoundException("Catalogue not found");
    }
    if (!catalogue.isPublic) {
      throw new NotFoundException("Catalogue not found");
    }
    if (catalogue.expiresAt && catalogue.expiresAt < new Date()) {
      throw new NotFoundException("This catalogue has expired");
    }

    return {
      id: catalogue.id,
      name: catalogue.name,
      slug: catalogue.slug,
      description: catalogue.description,
      mode: catalogue.mode,
      requiresPassword: !!catalogue.passwordHash,
      shop: catalogue.shop,
      expiresAt: catalogue.expiresAt,
    };
  }

  async unlockCatalogue(slug: string, password: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
    });

    if (!catalogue || catalogue.deletedAt || !catalogue.isPublic) {
      throw new NotFoundException("Catalogue not found");
    }
    if (!catalogue.passwordHash) {
      throw new BadRequestException("This catalogue is not password protected");
    }

    const valid = await bcrypt.compare(password, catalogue.passwordHash);
    if (!valid) {
      throw new ForbiddenException("Invalid password");
    }

    const token = createCatalogueToken(slug, catalogue.passwordHash);
    return { token };
  }

  async getPublicCatalogueItems(slug: string, token?: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
    });

    if (!catalogue || catalogue.deletedAt || !catalogue.isPublic) {
      throw new NotFoundException("Catalogue not found");
    }
    if (catalogue.expiresAt && catalogue.expiresAt < new Date()) {
      throw new NotFoundException("This catalogue has expired");
    }

    // If password protected, verify token
    if (catalogue.passwordHash) {
      if (!token) {
        throw new ForbiddenException("This catalogue requires a password. Please unlock first.");
      }
      if (!verifyCatalogueToken(token, slug, catalogue.passwordHash)) {
        throw new ForbiddenException("Invalid or expired token. Please unlock again.");
      }
    }

    const items = await this.prisma.catalogueItem.findMany({
      where: {
        catalogueId: catalogue.id,
        isHidden: false,
        inventoryItem: {
          visibility: { not: InventoryVisibility.HIDDEN },
        },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        inventoryItem: {
          select: {
            id: true,
            title: true,
            titleNe: true,
            metal: true,
            purity: true,
            images: true,
            totalPriceNpr: true,
            weightGrams: true,
            status: true,
            visibility: true,
            jewelleryType: true,
            variants: {
              select: {
                id: true,
                size: true,
                stock: true,
                additionalPriceNpr: true,
              },
            },
          },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      inventoryItemId: item.inventoryItemId,
      sortOrder: item.sortOrder,
      overridePrice: item.overridePrice,
      inventoryItem: {
        ...item.inventoryItem,
        sizesAvailable: item.inventoryItem.variants
          ?.filter((v) => v.stock > 0)
          .map((v) => v.size)
          .filter(Boolean),
        hasStock: item.inventoryItem.variants?.some((v) => v.stock > 0) ?? true,
      },
    }));
  }

  async recordView(slug: string, ip: string, userAgent?: string, referrer?: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
      select: { id: true, deletedAt: true },
    });
    if (!catalogue || catalogue.deletedAt) return;

    const viewerIpHash = hashViewerIp(ip);
    const hourBucket = new Date();
    hourBucket.setMinutes(0, 0, 0);

    // Deduplicate: same IP hash + same hour -> increment count
    const existingView = await this.prisma.catalogueViewEvent.findFirst({
      where: {
        catalogueId: catalogue.id,
        viewerIpHash,
        viewedAt: { gte: hourBucket },
      },
    });

    if (existingView) {
      await this.prisma.catalogueViewEvent.update({
        where: { id: existingView.id },
        data: { count: existingView.count + 1 },
      });
    } else {
      await this.prisma.catalogueViewEvent.create({
        data: {
          catalogueId: catalogue.id,
          viewerIpHash,
          userAgent: userAgent?.substring(0, 255),
          referrer: referrer?.substring(0, 500),
        },
      });
    }
  }

  // ─── Analytics ─────────────────────────────────────────────────────

  async getAnalytics(id: string, shopId: string) {
    const catalogue = await this.prisma.catalogue.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!catalogue) throw new NotFoundException("Catalogue not found");

    const [totalViews, uniqueViewers, last7Days] = await Promise.all([
      this.prisma.catalogueViewEvent.aggregate({
        where: { catalogueId: id },
        _sum: { count: true },
      }),
      this.prisma.catalogueViewEvent.groupBy({
        by: ["viewerIpHash"],
        where: { catalogueId: id },
      }),
      this.prisma.catalogueViewEvent.findMany({
        where: {
          catalogueId: id,
          viewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { viewedAt: "asc" },
      }),
    ]);

    return {
      totalViews: totalViews._sum.count ?? 0,
      uniqueViewers: uniqueViewers.length,
      last7Days,
    };
  }

  // ─── Customer Flows ────────────────────────────────────────────────

  async requestQuoteFromCatalogue(
    slug: string,
    userId: string,
    items: { inventoryItemId: string; variantId?: string; qty?: number }[],
    notes?: string,
  ) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
      select: { id: true, shopId: true, name: true, deletedAt: true, isPublic: true },
    });
    if (!catalogue || catalogue.deletedAt || !catalogue.isPublic) {
      throw new NotFoundException("Catalogue not found");
    }

    // Create a ShopQuote or store as metadata
    // Using the ShopQuote model if available, otherwise creating an RFQ-like quote
    const quote = await this.prisma.shopQuote.create({
      data: {
        shopId: catalogue.shopId,
        customerId: userId,
        quoteNumber: `CQ-${Date.now().toString(36).toUpperCase()}`,
        items: items.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          variantId: i.variantId,
          quantity: i.qty ?? 1,
        })),
        metadata: {
          source: "CATALOGUE",
          slug,
          catalogueName: catalogue.name,
          selectedItems: items,
        },
        status: "DRAFT",
        totalAmount: 0,
      },
    });

    return { quoteId: quote.id };
  }

  async messageShopFromCatalogue(slug: string, userId: string) {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug },
      select: {
        id: true,
        shopId: true,
        name: true,
        deletedAt: true,
        isPublic: true,
      },
    });
    if (!catalogue || catalogue.deletedAt || !catalogue.isPublic) {
      throw new NotFoundException("Catalogue not found");
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: { buyerId: userId, shopId: catalogue.shopId },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { buyerId: userId, shopId: catalogue.shopId },
      });
    }

    // Create system message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        senderRole: "SYSTEM",
        content: `Interested in catalogue: ${catalogue.name}`,
        isSystem: true,
        isSystemGenerated: true,
        messageType: "SYSTEM",
      },
    });

    return { conversationId: conversation.id };
  }

  // ─── Inventory Visibility ──────────────────────────────────────────

  async updateItemVisibility(
    itemId: string,
    shopId: string,
    userId: string,
    visibility: InventoryVisibility,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, shopId },
    });
    if (!item) throw new NotFoundException("Inventory item not found");

    const updated = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { visibility },
    });

    await this.auditService.log({
      userId,
      actorType: "USER",
      action: "UPDATE",
      resourceType: "INVENTORY_ITEM",
      resourceId: itemId,
      newValue: { visibility },
      metadata: { previousVisibility: item.visibility },
    });

    return updated;
  }
}
