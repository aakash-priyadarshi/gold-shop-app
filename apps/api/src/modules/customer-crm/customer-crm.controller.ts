import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../subscriptions/feature-gate.guard";
import { RequireFeature } from "../subscriptions/require-feature.decorator";
import { CustomerCrmService } from "./customer-crm.service";
import { AddCustomerNoteDto } from "./dto/customer-note.dto";

@ApiTags("customer-crm")
@Controller("users/customers")
@UseGuards(JwtAuthGuard, FeatureGateGuard)
@RequireFeature("crm")
@ApiBearerAuth()
export class CustomerCrmController {
  constructor(private crmService: CustomerCrmService) {}

  @Get("search")
  @ApiOperation({ summary: "Search customer directory" })
  async searchCustomers(
    @CurrentUser("shopId") shopId: string,
    @Query("query") query?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) {
      return { customers: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
    return this.crmService.searchCustomers(
      shopId,
      query,
      parseInt(page || "1"),
      parseInt(limit || "20"),
    );
  }

  @Get(":id/profile")
  @ApiOperation({ summary: "Get customer profile" })
  async getCustomerProfile(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    if (!shopId) throw new NotFoundException("Shop not found");

    const profile = await this.crmService.getCustomerProfile(id, shopId);
    if (!profile) throw new NotFoundException("Customer not found");
    return profile;
  }

  @Get(":id/orders")
  @ApiOperation({ summary: "Get customer orders" })
  async getCustomerOrders(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) throw new NotFoundException("Shop not found");
    return this.crmService.getCustomerOrders(
      id,
      shopId,
      parseInt(page || "1"),
      parseInt(limit || "20"),
    );
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Get customer purchase stats" })
  async getCustomerStats(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    if (!shopId) throw new NotFoundException("Shop not found");
    return this.crmService.getCustomerStats(id, shopId);
  }

  @Post(":id/notes")
  @ApiOperation({ summary: "Add note to customer" })
  async addCustomerNote(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: AddCustomerNoteDto,
  ) {
    const shopId = user?.shopId;
    if (!shopId) throw new NotFoundException("Shop not found");
    return this.crmService.addNote(id, shopId, user.id, dto.note, dto.category);
  }

  @Get(":id/notes")
  @ApiOperation({ summary: "Get customer notes" })
  async getCustomerNotes(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    if (!shopId) throw new NotFoundException("Shop not found");
    return this.crmService.getNotes(id, shopId);
  }
}
