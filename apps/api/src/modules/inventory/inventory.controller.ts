import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InventoryService } from "./inventory.service";
import { InventorySetsService, InventoryLocationTransferService } from "./inventory-sets.service";
import { StorageLocationsService } from "./storage-locations.service";
import { StockAuditService } from "./stock-audit.service";
import { ProductDescriptionService } from "./product-description.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryFilterDto,
  MultiTagPrintDto,
  GenerateProductDescriptionDto,
  EnhanceProductImagesDto,
} from "./dto/inventory.dto";
import {
  CreateSetDto,
  CreateStorageLocationDto,
  TransferLocationDto,
  UpdateSetDto,
  UpdateStorageLocationDto,
} from "./dto/sets-locations.dto";
import { SkipSecurity } from "../security/security.guard";
import { FeatureGateGuard } from "../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../core/subscriptions/require-feature.decorator";
import { ImageEnhancementService } from "./image-enhancement.service";

@ApiTags("inventory")
@Controller("inventory")
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private setsService: InventorySetsService,
    private locationsService: StorageLocationsService,
    private transferService: InventoryLocationTransferService,
    private stockAuditService: StockAuditService,
    private productDescriptionService: ProductDescriptionService,
    private imageEnhancementService: ImageEnhancementService,
  ) {}

  // Public endpoints
  @Get()
  @SkipSecurity()
  @ApiOperation({ summary: "Search inventory items" })
  async findAll(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.findAll(filters);
  }

  // ── Storage locations ──────────────────────────────────────────
  @Get("shop/:shopId/storage-locations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async listStorageLocations(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only access your own shop");
    }
    return this.locationsService.listTree(shopId, userId);
  }

  @Post("shop/:shopId/storage-locations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async createStorageLocation(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: CreateStorageLocationDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.locationsService.create(shopId, userId, dto);
  }

  @Patch("shop/:shopId/storage-locations/:locationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async updateStorageLocation(
    @Param("shopId") shopId: string,
    @Param("locationId") locationId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: UpdateStorageLocationDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.locationsService.update(shopId, userId, locationId, dto);
  }

  @Delete("shop/:shopId/storage-locations/:locationId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async archiveStorageLocation(
    @Param("shopId") shopId: string,
    @Param("locationId") locationId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.locationsService.archive(shopId, userId, locationId);
  }

  @Post("shop/:shopId/transfer-location")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async transferLocation(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: TransferLocationDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.transferService.transfer(shopId, userId, dto);
  }

  // ── Sets ───────────────────────────────────────────────────────
  @Post("shop/:shopId/sets")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async createSet(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: CreateSetDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.setsService.createSet(shopId, userId, dto);
  }

  @Get("shop/:shopId/sets/:setId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async getSet(
    @Param("shopId") shopId: string,
    @Param("setId") setId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only access your own shop");
    }
    return this.setsService.getSet(shopId, userId, setId);
  }

  @Patch("shop/:shopId/sets/:setId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async updateSet(
    @Param("shopId") shopId: string,
    @Param("setId") setId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: UpdateSetDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.setsService.updateSet(shopId, userId, setId, dto);
  }

  @Post("shop/:shopId/sets/:setId/break")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  async breakSet(
    @Param("shopId") shopId: string,
    @Param("setId") setId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only manage your own shop");
    }
    return this.setsService.breakSet(shopId, userId, setId);
  }

  // Protected endpoints for shopkeepers
  @Post("shop/:shopId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create inventory item" })
  async create(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only add items to your own shop");
    }
    return this.inventoryService.create(shopId, userId, dto);
  }

  @Post("shop/:shopId/generate-description")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
  @Roles("SHOPKEEPER")
  @RequireFeature("aiDesignGeneration")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate a Pro+ AI product description (0.25 AI credits)",
  })
  async generateDescription(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: GenerateProductDescriptionDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only generate descriptions for your own shop");
    }
    return this.productDescriptionService.generateAiDescription({
      userId,
      shopId,
      specs: {
        jewelleryType: dto.jewelleryType,
        metalType: dto.metalType,
        purity: dto.purity,
        weightGrams: dto.weightGrams,
        weightUnit: dto.weightUnit,
        gemstones: dto.gemstones,
      },
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Post("shop/:shopId/images/enhance")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
  @Roles("SHOPKEEPER")
  @RequireFeature("aiImageEnhancement")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enhance product photos with studio lighting" })
  async enhanceProductImages(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: EnhanceProductImagesDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only enhance photos for your own shop");
    }
    return this.imageEnhancementService.enhance({
      userId,
      shopId,
      imageUrls: dto.imageUrls,
      referenceImageUrls: dto.referenceImageUrls,
      model: dto.model,
      context: dto.context,
    });
  }

  @Get("shop/:shopId/items")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop inventory (for owner)" })
  async getShopInventory(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Query() filters: InventoryFilterDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only access your own shop inventory");
    }
    let locationIds: string[] | undefined;
    if (filters.locationId && filters.includeSubtree) {
      locationIds = await this.locationsService.collectSubtreeIds(
        shopId,
        filters.locationId,
      );
    }
    return this.inventoryService.findShopInventory(
      shopId,
      userId,
      filters,
      locationIds,
    );
  }

  @Get("shop/:shopId/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get inventory statistics" })
  async getStats(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only access your own shop stats");
    }
    return this.inventoryService.getInventoryStats(shopId);
  }

  @Get("shop/:shopId/lookup")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lookup inventory by barcode / SKU (for POS scanner)" })
  async lookupByCode(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @Query("code") code: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only scan your own shop inventory");
    }
    return this.inventoryService.findByCode(shopId, code);
  }

  @Post("shop/:shopId/tag-print/multi")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
  @Roles("SHOPKEEPER")
  @RequireFeature("multiTagPrint")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Authorize and prepare a multi-tag print job" })
  async prepareMultiTagPrint(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() dto: MultiTagPrintDto,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only print tags for your own shop");
    }
    return this.inventoryService.getTagPrintItems(shopId, dto.itemIds);
  }

  // ── Stock audit (RFID / barcode keyboard-wedge) ───────────────
  @Post("shop/:shopId/stock-audits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Start RFID/barcode stock audit session" })
  async startStockAudit(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() body?: { notes?: string },
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.start(shopId, userId, body?.notes);
  }

  @Get("shop/:shopId/stock-audits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List recent stock audits" })
  async listStockAudits(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.list(shopId, userId);
  }

  @Get("shop/:shopId/stock-audits/:auditId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get stock audit detail" })
  async getStockAudit(
    @Param("shopId") shopId: string,
    @Param("auditId") auditId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.get(shopId, userId, auditId);
  }

  @Post("shop/:shopId/stock-audits/:auditId/scan")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Record a barcode/RFID scan in an audit" })
  async scanStockAudit(
    @Param("shopId") shopId: string,
    @Param("auditId") auditId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() body: { code: string },
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.scan(shopId, userId, auditId, body.code);
  }

  @Post("shop/:shopId/stock-audits/:auditId/complete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete stock audit and compute shrinkage report" })
  async completeStockAudit(
    @Param("shopId") shopId: string,
    @Param("auditId") auditId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.complete(shopId, userId, auditId);
  }

  @Post("shop/:shopId/stock-audits/:auditId/cancel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel an in-progress stock audit" })
  async cancelStockAudit(
    @Param("shopId") shopId: string,
    @Param("auditId") auditId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only audit your own shop");
    }
    return this.stockAuditService.cancel(shopId, userId, auditId);
  }

  @Patch("shop/:shopId/bulk-prices")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Bulk update prices" })
  async bulkUpdatePrices(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body() updates: { itemId: string; totalPriceNpr: number }[],
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only update your own shop prices");
    }
    return this.inventoryService.bulkUpdatePrices(shopId, userId, updates);
  }

  @Post("shop/:shopId/reprice/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Preview catalog reprice from shop metal rates" })
  async repricePreview(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body()
    body: {
      itemIds?: string[];
      metalTypes?: string[];
      mode?: "FROM_SHOP_RATES" | "FROM_MARKET_RATES";
      makingChargeMode?: "KEEP" | "RECALC_PERCENT";
      makingChargePercent?: number;
    },
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only reprice your own shop");
    }
    return this.inventoryService.repricePreview(shopId, userId, body || {});
  }

  @Post("shop/:shopId/reprice/apply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Apply catalog reprice and write price history" })
  async repriceApply(
    @Param("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") userShopId: string,
    @Body()
    body: {
      updates: Array<{
        itemId: string;
        metalValueNpr: number;
        makingChargeNpr: number;
        gemstoneValueNpr?: number;
        taxNpr?: number;
        totalPriceNpr: number;
      }>;
      reason?: string;
      rateSnapshot?: Record<string, number>;
    },
  ) {
    if (shopId !== userShopId) {
      throw new ForbiddenException("You can only reprice your own shop");
    }
    return this.inventoryService.repriceApply(shopId, userId, body);
  }

  @Get(":id")
  @SkipSecurity()
  @ApiOperation({ summary: "Get inventory item details" })
  async findOne(@Param("id") id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update inventory item" })
  async update(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(id, userId, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SHOPKEEPER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete inventory item" })
  async delete(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.inventoryService.delete(id, userId);
  }
}
