import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AddItemsDto } from "./dto/add-items.dto";
import { CheckoutDto, UpdateItemDto } from "./dto/checkout.dto";
import { CreatePosSessionDto } from "./dto/create-session.dto";
import { PosService } from "./pos.service";

@ApiTags("pos")
@Controller("pos")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PosController {
  constructor(private posService: PosService) {}

  // ─── Get Customer Picks (wishlist items belonging to this shop) ───

  @Get("customer-picks/:customerId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Get customer wishlist items for this shop" })
  async getCustomerPicks(
    @CurrentUser("shopId") shopId: string,
    @Param("customerId") customerId: string,
  ) {
    return this.posService.getCustomerPicks(shopId, customerId);
  }

  // ─── Get Active Session ───

  @Get("session/active")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Get the current active POS session for this shop" })
  async getActiveSession(@CurrentUser("shopId") shopId: string) {
    return this.posService.getActiveSessionForShop(shopId);
  }

  // ─── Create POS Session ───

  @Post("session")
  @Roles("SHOPKEEPER")
  @ApiOperation({
    summary: "Create a new POS session (cancels any existing active session)",
  })
  async createSession(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreatePosSessionDto,
  ) {
    return this.posService.createSession(shopId, userId, dto);
  }

  // ─── Add Items to Session ───

  @Post("session/:sessionId/items")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Add items to a POS session basket" })
  async addItems(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.posService.addItems(shopId, sessionId, userId, dto);
  }

  // ─── Update Item Qty ───

  @Patch("session/:sessionId/items/:itemId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Update item qty in POS basket (qty=0 removes)" })
  async updateItem(
    @CurrentUser("shopId") shopId: string,
    @Param("sessionId") sessionId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.posService.updateItem(shopId, sessionId, itemId, dto);
  }

  // ─── Checkout ───

  @Post("session/:sessionId/checkout")
  @Roles("SHOPKEEPER")
  @ApiOperation({
    summary: "Checkout POS session: create invoice + decrement stock",
  })
  async checkout(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.posService.checkout(shopId, sessionId, userId, dto);
  }

  // ─── Cancel Session ───

  @Delete("session/:sessionId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Cancel a POS session and release reserved stock" })
  async cancelSession(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.posService.cancelSession(shopId, sessionId, userId);
  }

  // ─── Get Session Details ───

  @Get("session/:sessionId")
  @Roles("SHOPKEEPER")
  @ApiOperation({ summary: "Get POS session details" })
  async getSession(
    @CurrentUser("shopId") shopId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.posService.getSession(shopId, sessionId);
  }
}
