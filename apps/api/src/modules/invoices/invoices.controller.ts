import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateInvoiceDto, UpdatePaymentDto } from "./dto/invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.create(shopId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser("shopId") shopId: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findAll(shopId, {
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get("settings")
  async getSettings(@CurrentUser("shopId") shopId: string) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.getSettings(shopId);
  }

  @Patch("settings")
  async updateSettings(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: any,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.updateSettings(shopId, dto);
  }

  @Get("stats")
  async getStats(@CurrentUser("shopId") shopId: string) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.getStats(shopId);
  }

  @Get(":id")
  async findById(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findById(id, shopId);
  }

  @Get("order/:orderId")
  async findByOrder(
    @CurrentUser("shopId") shopId: string,
    @Param("orderId") orderId: string,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findByOrder(orderId, shopId);
  }

  @Patch(":id/payment")
  async recordPayment(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.recordPayment(id, shopId, dto);
  }

  @Post(":id/void")
  async voidInvoice(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.voidInvoice(id, shopId);
  }
}
