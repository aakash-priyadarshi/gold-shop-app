import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { SkipCache } from "../../common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { FeatureGateGuard } from "../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../core/subscriptions/require-feature.decorator";
import {
  ConfirmPaymentDto,
  CreateInvoiceDto,
  UpdatePaymentDto,
} from "./dto/invoice.dto";
import {
  ShareInvoiceEmailDto,
  ShareInvoiceSmsDto,
} from "./dto/share-invoice.dto";
import { UpdateInvoiceSettingsDto } from "./dto/update-invoice-settings.dto";
import { InvoicePdfService } from "./invoice-pdf.service";
import { InvoicesService } from "./invoices.service";

function corsOriginForPdf(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    const isOrivraa =
      host === "orivraa.com" || host.endsWith(".orivraa.com");
    if (parsed.protocol === "https:" && isOrivraa) return origin;
    if (
      process.env.NODE_ENV !== "production" &&
      (host === "localhost" || host === "127.0.0.1")
    ) {
      return origin;
    }
  } catch {
    return null;
  }
  return null;
}

function applyPdfCors(req: Request, res: Response) {
  const origin = corsOriginForPdf(
    typeof req.headers.origin === "string" ? req.headers.origin : undefined,
  );
  if (!origin) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Length, Content-Type",
  );
  res.setHeader("Vary", "Origin");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

// NOTE: Invoicing is a core USP feature and is intentionally NOT gated behind a
// paid plan or shop verification. PDF share is free for all shops.
@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

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
    // POS audit links are assigned only by authenticated POS flows, which
    // derive their cashier/session/register/shift server-side. A regular
    // invoice request must not be able to impersonate another POS cashier.
    const manualInvoiceDto = { ...dto };
    for (const field of [
      "posSessionId",
      "posRegisterId",
      "posShiftId",
      "posCashierUserId",
    ] as const) {
      delete manualInvoiceDto[field];
    }
    return this.invoicesService.create(shopId, manualInvoiceDto);
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
  @SkipCache()
  async downloadPdf(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!shopId) {
      applyPdfCors(req, res);
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "No shop associated with this user",
      });
      return;
    }
    try {
      const { buffer, filename } =
        await this.invoicePdfService.generatePdfBuffer(id, shopId);
      applyPdfCors(req, res);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", "private, no-store");
      res.status(200).end(buffer);
    } catch (err) {
      applyPdfCors(req, res);
      if (err instanceof HttpException) {
        const status = err.getStatus();
        const body = err.getResponse();
        res.status(status).json(
          typeof body === "string"
            ? { statusCode: status, message: body }
            : body,
        );
        return;
      }
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Could not generate PDF",
      });
      this.logger.error(
        `PDF generation failed for invoice ${id}: ${String(err)}`,
      );
    }
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

  @Post(":id/payments/:paymentId/confirm")
  async confirmPayment(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: ConfirmPaymentDto,
  ) {
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    return this.invoicesService.confirmPayment(id, paymentId, shopId, userId, dto);
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
