import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StorageLocationKind } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateStorageLocationDto,
  UpdateStorageLocationDto,
} from "./dto/sets-locations.dto";

@Injectable()
export class StorageLocationsService {
  constructor(private prisma: PrismaService) {}

  private async assertShopOwner(shopId: string, userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, userId },
    });
    if (!shop) throw new ForbiddenException("You do not own this shop");
    return shop;
  }

  private validateKind(
    kind: StorageLocationKind,
    parentKind: StorageLocationKind | null,
  ) {
    if (kind === StorageLocationKind.AREA && parentKind) {
      throw new BadRequestException("AREA locations must be top-level");
    }
    if (kind === StorageLocationKind.CABINET && parentKind !== StorageLocationKind.AREA) {
      throw new BadRequestException("CABINET must be under an AREA");
    }
    if (kind === StorageLocationKind.BIN && parentKind !== StorageLocationKind.CABINET) {
      throw new BadRequestException("BIN must be under a CABINET");
    }
  }

  async listTree(shopId: string, userId: string) {
    await this.assertShopOwner(shopId, userId);
    const locations = await this.prisma.storageLocation.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { items: true, children: true } },
      },
    });

    type LocNode = (typeof locations)[number] & { children: LocNode[] };
    const byId = new Map<string, LocNode>();
    for (const loc of locations) {
      byId.set(loc.id, { ...loc, children: [] });
    }
    const roots: LocNode[] = [];
    for (const loc of byId.values()) {
      if (loc.parentId && byId.has(loc.parentId)) {
        byId.get(loc.parentId)!.children.push(loc);
      } else {
        roots.push(loc);
      }
    }
    return { locations: roots, flat: locations };
  }

  async create(shopId: string, userId: string, dto: CreateStorageLocationDto) {
    await this.assertShopOwner(shopId, userId);
    const kind = (dto.kind as StorageLocationKind) || StorageLocationKind.AREA;
    let parentKind: StorageLocationKind | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.storageLocation.findFirst({
        where: { id: dto.parentId, shopId },
      });
      if (!parent) throw new NotFoundException("Parent location not found");
      parentKind = parent.kind;
    }
    this.validateKind(kind, parentKind);

    return this.prisma.storageLocation.create({
      data: {
        shopId,
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        parentId: dto.parentId || null,
        kind,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(
    shopId: string,
    userId: string,
    locationId: string,
    dto: UpdateStorageLocationDto,
  ) {
    await this.assertShopOwner(shopId, userId);
    const existing = await this.prisma.storageLocation.findFirst({
      where: { id: locationId, shopId },
    });
    if (!existing) throw new NotFoundException("Location not found");

    const kind = (dto.kind as StorageLocationKind) || existing.kind;
    const parentId =
      dto.parentId === undefined ? existing.parentId : dto.parentId;
    let parentKind: StorageLocationKind | null = null;
    if (parentId) {
      if (parentId === locationId) {
        throw new BadRequestException("Location cannot be its own parent");
      }
      const parent = await this.prisma.storageLocation.findFirst({
        where: { id: parentId, shopId },
      });
      if (!parent) throw new NotFoundException("Parent location not found");
      parentKind = parent.kind;
    }
    this.validateKind(kind, parentKind);

    return this.prisma.storageLocation.update({
      where: { id: locationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
        ...(dto.parentId !== undefined ? { parentId } : {}),
        ...(dto.kind !== undefined ? { kind } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async archive(shopId: string, userId: string, locationId: string) {
    await this.assertShopOwner(shopId, userId);
    const existing = await this.prisma.storageLocation.findFirst({
      where: { id: locationId, shopId },
    });
    if (!existing) throw new NotFoundException("Location not found");

    await this.prisma.$transaction([
      this.prisma.inventoryItem.updateMany({
        where: { shopId, locationId },
        data: { locationId: null },
      }),
      this.prisma.storageLocation.update({
        where: { id: locationId },
        data: { isActive: false },
      }),
    ]);

    return { success: true };
  }

  /** Collect location id + all descendant ids for subtree filter */
  async collectSubtreeIds(shopId: string, rootId: string): Promise<string[]> {
    const all = await this.prisma.storageLocation.findMany({
      where: { shopId, isActive: true },
      select: { id: true, parentId: true },
    });
    const children = new Map<string, string[]>();
    for (const loc of all) {
      if (!loc.parentId) continue;
      const list = children.get(loc.parentId) || [];
      list.push(loc.id);
      children.set(loc.parentId, list);
    }
    const result: string[] = [];
    const walk = (id: string) => {
      result.push(id);
      for (const child of children.get(id) || []) walk(child);
    };
    walk(rootId);
    return result;
  }
}
