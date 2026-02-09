import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { CustomerCounterOfferDto } from "./dto/customer-counter-offer.dto";
import { OffersService } from "./offers.service";

@ApiTags("offers")
@Controller("offers")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create an offer for an RFQ" })
  async create(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(shopId, dto);
  }

  @Post(":id/counter")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a counter-offer (shop)" })
  async counter(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.createCounterOffer(id, shopId, dto);
  }

  @Post(":id/customer-counter")
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "Customer creates a counter-offer" })
  async customerCounter(
    @Param("id") id: string,
    @CurrentUser("id") customerId: string,
    @Body() dto: CustomerCounterOfferDto,
  ) {
    return this.offersService.customerCounter(id, customerId, dto);
  }

  @Post(":id/accept")
  @ApiOperation({
    summary: "Accept an offer (customer or shop based on offer origin)",
  })
  async accept(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: UserRole,
    @CurrentUser("shopId") shopId: string | null,
  ) {
    return this.offersService.acceptOffer(id, userId, role, shopId);
  }

  @Post(":id/decline")
  @ApiOperation({ summary: "Decline an offer" })
  async decline(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: UserRole,
    @CurrentUser("shopId") shopId: string | null,
    @Body() body: { reason?: string },
  ) {
    return this.offersService.declineOffer(
      id,
      userId,
      role,
      shopId,
      body.reason,
    );
  }

  @Get("rfq/:rfqId")
  @ApiOperation({ summary: "Get all offers for an RFQ" })
  async findByRfq(@Param("rfqId") rfqId: string) {
    return this.offersService.findByRfq(rfqId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get offer details" })
  async findOne(@Param("id") id: string) {
    return this.offersService.findOne(id);
  }

  @Patch(":id/withdraw")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Withdraw an offer" })
  async withdraw(
    @Param("id") id: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.offersService.withdraw(id, shopId);
  }
}
