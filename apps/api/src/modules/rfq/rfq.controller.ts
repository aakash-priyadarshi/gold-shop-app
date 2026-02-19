import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RfqStatus, UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { BroadcastRfqDto } from "./dto/broadcast-rfq.dto";
import { CreateCatalogueWalkInRfqDto } from "./dto/create-catalogue-walkin-rfq.dto";
import { CreateRfqDto } from "./dto/create-rfq.dto";
import { SelectOfferDto } from "./dto/select-offer.dto";
import { RfqService } from "./rfq.service";

@ApiTags("rfq")
@Controller("rfq")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RfqController {
  constructor(private rfqService: RfqService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new RFQ (Request for Quote)" })
  async create(@CurrentUser("id") userId: string, @Body() dto: CreateRfqDto) {
    return this.rfqService.create(userId, dto);
  }

  @Get("my-requests")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "List all RFQs for current customer" })
  async findMyRequests(
    @CurrentUser("id") userId: string,
    @Query("status") status?: RfqStatus,
  ) {
    return this.rfqService.findAllForCustomer(userId, status);
  }

  @Get("shop-requests")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List all RFQs received by shop (supports source filter)" })
  async findShopRequests(
    @CurrentUser("shopId") shopId: string,
    @Query("source") source?: string,
  ) {
    return this.rfqService.findAllForShop(shopId, source);
  }

  @Post("walk-in")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a walk-in RFQ from catalogue items (seller only)" })
  async createWalkInRfq(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateCatalogueWalkInRfqDto,
  ) {
    return this.rfqService.createWalkInRfq(shopId, userId, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get RFQ details" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: string,
  ) {
    return this.rfqService.findOne(id, userId, role);
  }

  @Get(":id/eligible-shops")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: "Get shops eligible to receive this RFQ with price estimates",
  })
  async getEligibleShops(
    @Param("id") id: string,
    @Query("customerCity") customerCity?: string,
  ) {
    return this.rfqService.getEligibleShops(id, customerCity);
  }

  @Post(":id/broadcast")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "Broadcast RFQ to selected shops" })
  async broadcast(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: BroadcastRfqDto,
  ) {
    return this.rfqService.broadcast(id, userId, dto);
  }

  @Post(":id/select-offer")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "Select an offer for the RFQ" })
  async selectOffer(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SelectOfferDto,
  ) {
    return this.rfqService.selectOffer(id, dto.offerId, userId);
  }

  @Post(":id/send-to-seller")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: "Send RFQ directly to a single seller with optional budget update",
  })
  async sendToSeller(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body()
    dto: {
      shopId: string;
      budgetMinNpr?: number;
      budgetMaxNpr?: number;
      message?: string;
    },
  ) {
    return this.rfqService.sendToSeller(id, userId, dto);
  }
}
