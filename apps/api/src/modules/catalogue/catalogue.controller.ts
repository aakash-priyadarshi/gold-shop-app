import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InventoryVisibility } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CatalogueService } from "./catalogue.service";
import { AddCatalogueItemDto } from "./dto/add-item.dto";
import { CreateCatalogueDto } from "./dto/create-catalogue.dto";
import { ReorderItemsDto } from "./dto/reorder-items.dto";
import { UpdateCatalogueDto } from "./dto/update-catalogue.dto";

@ApiTags("catalogues")
@Controller("catalogues")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CatalogueController {
  constructor(private catalogueService: CatalogueService) {}

  @Post()
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Create a new catalogue" })
  async create(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateCatalogueDto,
  ) {
    return this.catalogueService.create(shopId, userId, dto);
  }

  @Get("my")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "List catalogues for my shop" })
  async findMyCatalogues(
    @CurrentUser("shopId") shopId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.catalogueService.findAllForShop(shopId, page, limit);
  }

  @Get(":id")
  @Roles("SHOPKEEPER", "ADMIN")
  @ApiOperation({ summary: "Get catalogue with items" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.catalogueService.findOneForShop(id, shopId);
  }

  @Patch(":id")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Update catalogue" })
  async update(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateCatalogueDto,
  ) {
    return this.catalogueService.update(id, shopId, userId, dto);
  }

  @Delete(":id")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Soft delete catalogue" })
  async remove(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.catalogueService.softDelete(id, shopId, userId);
  }

  // ─── Items ─────────────────────────────────────────────────────────

  @Post(":id/items")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Add item to catalogue" })
  async addItem(
    @Param("id") catalogueId: string,
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: AddCatalogueItemDto,
  ) {
    return this.catalogueService.addItem(catalogueId, shopId, userId, dto);
  }

  @Patch(":id/items/:itemId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Update catalogue item" })
  async updateItem(
    @Param("id") catalogueId: string,
    @Param("itemId") itemId: string,
    @CurrentUser("shopId") shopId: string,
    @Body()
    data: {
      sortOrder?: number;
      overridePrice?: number | null;
      isHidden?: boolean;
    },
  ) {
    return this.catalogueService.updateItem(catalogueId, itemId, shopId, data);
  }

  @Delete(":id/items/:itemId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Remove item from catalogue" })
  async removeItem(
    @Param("id") catalogueId: string,
    @Param("itemId") itemId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.catalogueService.removeItem(catalogueId, itemId, shopId);
  }

  @Post(":id/items/reorder")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Reorder catalogue items" })
  async reorderItems(
    @Param("id") catalogueId: string,
    @CurrentUser("shopId") shopId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.catalogueService.reorderItems(catalogueId, shopId, dto);
  }

  // ─── Analytics ─────────────────────────────────────────────────────

  @Get(":id/analytics")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Get catalogue view analytics" })
  async getAnalytics(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.catalogueService.getAnalytics(id, shopId);
  }

  // ─── Inventory Visibility ──────────────────────────────────────────

  @Patch("inventory/:itemId/visibility")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Update inventory item visibility" })
  async updateVisibility(
    @Param("itemId") itemId: string,
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { visibility: InventoryVisibility },
  ) {
    return this.catalogueService.updateItemVisibility(
      itemId,
      shopId,
      userId,
      body.visibility,
    );
  }
}
