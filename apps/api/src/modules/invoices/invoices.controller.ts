import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { FeatureGateGuard } from "../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../core/subscriptions/require-feature.decorator";
import { CreateInvoiceDto, UpdatePaymentDto } from "./dto/invoice.dto";
import {
  ShareInvoiceEmailDto,
  ShareInvoiceSmsDto,
} from "./dto/share-invoice.dto";
import { UpdateInvoiceSettingsDto } from "./dto/update-invoice-settings.dto";
import { InvoicePdfService } from "./invoice-pdf.service";
import { InvoicesService } from "./invoices.service";

// NOTE: Invoicing is a core USP feature and is intentionally NOT gated behind a
// paid plan. New shops can always create bills/invoices (unverified shops just
// get a watermark until KYC). PDF share is free for all shops.
@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

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
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.findAll(shopId, {
      status,
      search,
      dateFrom,
      dateTo,
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
    @Body() dto: UpdateInvoiceSettingsDto,
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

  /** On-demand PDF — not stored. Free for all shops. */
  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  async downloadPdf(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    const { buffer, filename } = await this.invoicePdfService.generatePdfBuffer(
      id,
      shopId,
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"`,
    );
    return new StreamableFile(buffer);
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

  /** Email with PDF attachment — free for all shops (PDF share decision). */
  @Post(":id/share/email")
  async shareEmail(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: ShareInvoiceEmailDto,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.shareViaEmail(id, shopId, dto);
  }

  @Post(":id/share/sms")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("invoiceShareSms")
  async shareSms(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: ShareInvoiceSmsDto,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.shareViaSms(id, shopId, dto);
  }
}

/**
 * Public, no-auth bill verification (QR on printed invoice → /verify-bill).
 * Exposes only safe, display-only fields.
 */
@Controller("invoices/public")
export class InvoicesPublicController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get("verify/:token")
  async verify(@Param("token") token: string) {
    return this.invoicesService.verifyByToken(token);
  }
}
