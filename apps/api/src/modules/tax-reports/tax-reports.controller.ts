import {
    Body,
    Controller,
    Get,
    Ip,
    Param,
    Post,
    Query,
    Res,
    UseGuards
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { FeatureGateGuard } from "../subscriptions/feature-gate.guard";
import { RequireFeature } from "../subscriptions/require-feature.decorator";
import { TaxReportsService } from "./tax-reports.service";

@Controller("tax-reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
export class TaxReportsController {
  constructor(private readonly svc: TaxReportsService) {}

  private requireShop(shopId?: string) {
    if (!shopId) throw new Error("No shop associated with this user");
  }

  // ── Universal summary ────────────────────────────────────────────
  @Get("summary")
  async summary(
    @CurrentUser("shopId") shopId: string,
    @Query("country") country: string,
    @Query("period") period: string,
  ) {
    this.requireShop(shopId);
    return this.svc.getSummary(shopId, country, period);
  }

  // ── INDIA ────────────────────────────────────────────────────────
  @Get("india/gstr1")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async indiaGstr1(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getIndiaGstr1(shopId, period);
    await this.svc.logExport({
      shopId,
      exportType: "GSTR1",
      country: "IN",
      period,
      format: format.toUpperCase(),
      requestedBy: userId,
      ip,
      rowCount: data.count,
    });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="GSTR1-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  @Get("india/gstr3b")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async indiaGstr3b(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Ip() ip: string,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getIndiaGstr3b(shopId, period);
    await this.svc.logExport({ shopId, exportType: "GSTR3B", country: "IN", period, format: "JSON", requestedBy: userId, ip });
    return data;
  }

  @Get("india/hsn")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async indiaHsn(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireShop(shopId);
    const rows = await this.svc.getIndiaHsnSummary(shopId, period);
    await this.svc.logExport({ shopId, exportType: "HSN", country: "IN", period, format: format.toUpperCase(), requestedBy: userId, ip, rowCount: rows.length });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="HSN-${period}.csv"`);
      return this.svc.toCsv(rows);
    }
    return rows;
  }

  @Get("india/tally.xml")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async indiaTally(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireShop(shopId);
    const xml = await this.svc.getTallyXml(shopId, period);
    await this.svc.logExport({ shopId, exportType: "TALLY_XML", country: "IN", period, format: "XML", requestedBy: userId, ip });
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="Tally-${period}.xml"`);
    return xml;
  }

  // ── NEPAL ────────────────────────────────────────────────────────
  @Get("nepal/vat")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async nepalVat(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Ip() ip: string,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getNepalVat(shopId, period);
    await this.svc.logExport({ shopId, exportType: "NEPAL_VAT", country: "NP", period, format: "JSON", requestedBy: userId, ip });
    return data;
  }

  // ── UAE ──────────────────────────────────────────────────────────
  @Get("uae/vat201")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async uaeVat201(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Ip() ip: string,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getUaeVat201(shopId, period);
    await this.svc.logExport({ shopId, exportType: "UAE_VAT201", country: "AE", period, format: "JSON", requestedBy: userId, ip });
    return data;
  }

  // ── UK ───────────────────────────────────────────────────────────
  @Get("uk/mtd")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async ukMtd(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Ip() ip: string,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getUkMtdNineBox(shopId, period);
    await this.svc.logExport({ shopId, exportType: "UK_MTD", country: "GB", period, format: "JSON", requestedBy: userId, ip });
    return data;
  }

  // ── EU OSS ───────────────────────────────────────────────────────
  @Get("eu/oss")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async euOss(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getEuOss(shopId, period);
    await this.svc.logExport({ shopId, exportType: "EU_OSS", country: "EU", period, format: format.toUpperCase(), requestedBy: userId, ip, rowCount: data.rows.length });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="EU-OSS-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  // ── US ───────────────────────────────────────────────────────────
  @Get("us/state")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxReports")
  async usState(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireShop(shopId);
    const data = await this.svc.getUsStateSummary(shopId, period);
    await this.svc.logExport({ shopId, exportType: "US_STATE", country: "US", period, format: format.toUpperCase(), requestedBy: userId, ip, rowCount: data.rows.length });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="US-State-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  // ── CA share link ────────────────────────────────────────────────
  @Post("share-link")
  @UseGuards(FeatureGateGuard)
  @RequireFeature("taxCaShare")
  async createShareLink(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() body: { country: string; period: string; ttlDays?: number },
    @Ip() ip: string,
  ) {
    this.requireShop(shopId);
    const { token, expiresAt } = this.svc.generateShareToken(
      shopId,
      body.country,
      body.period,
      body.ttlDays || 7,
    );
    await this.svc.logExport({
      shopId,
      exportType: "CA_SHARE",
      country: body.country,
      period: body.period,
      format: "LINK",
      requestedBy: userId,
      ip,
      shareToken: token,
      shareExpiresAt: expiresAt,
    });
    return { token, expiresAt };
  }

  // ── Admin: view any shop's tax data ──────────────────────────────
  @Get("admin/shop-summary")
  @Roles(UserRole.ADMIN)
  async adminShopSummary(
    @Query("shopId") shopId: string,
    @Query("country") country: string,
    @Query("period") period: string,
  ) {
    if (!shopId) throw new Error("shopId is required");
    return this.svc.getSummary(shopId, country, period);
  }

  @Get("admin/india/gstr3b")
  @Roles(UserRole.ADMIN)
  async adminIndiaGstr3b(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
  ) {
    if (!shopId) throw new Error("shopId is required");
    return this.svc.getIndiaGstr3b(shopId, period);
  }

  @Get("admin/india/hsn")
  @Roles(UserRole.ADMIN)
  async adminIndiaHsn(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) throw new Error("shopId is required");
    const rows = await this.svc.getIndiaHsnSummary(shopId, period);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="HSN-${period}.csv"`);
      return this.svc.toCsv(rows);
    }
    return rows;
  }

  @Get("admin/india/gstr1")
  @Roles(UserRole.ADMIN)
  async adminIndiaGstr1(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) throw new Error("shopId is required");
    const data = await this.svc.getIndiaGstr1(shopId, period);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="GSTR1-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  @Get("admin/india/tally.xml")
  @Roles(UserRole.ADMIN)
  async adminIndiaTally(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) throw new Error("shopId is required");
    const xml = await this.svc.getTallyXml(shopId, period);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="Tally-${period}.xml"`);
    return xml;
  }

  @Get("admin/nepal/vat")
  @Roles(UserRole.ADMIN)
  async adminNepalVat(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
  ) {
    if (!shopId) throw new Error("shopId is required");
    return this.svc.getNepalVat(shopId, period);
  }

  @Get("admin/uae/vat201")
  @Roles(UserRole.ADMIN)
  async adminUaeVat201(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
  ) {
    if (!shopId) throw new Error("shopId is required");
    return this.svc.getUaeVat201(shopId, period);
  }

  @Get("admin/uk/mtd")
  @Roles(UserRole.ADMIN)
  async adminUkMtd(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
  ) {
    if (!shopId) throw new Error("shopId is required");
    return this.svc.getUkMtdNineBox(shopId, period);
  }

  @Get("admin/eu/oss")
  @Roles(UserRole.ADMIN)
  async adminEuOss(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) throw new Error("shopId is required");
    const data = await this.svc.getEuOss(shopId, period);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="EU-OSS-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  @Get("admin/us/state")
  @Roles(UserRole.ADMIN)
  async adminUsState(
    @Query("shopId") shopId: string,
    @Query("period") period: string,
    @Query("format") format: "json" | "csv" = "json",
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!shopId) throw new Error("shopId is required");
    const data = await this.svc.getUsStateSummary(shopId, period);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="US-State-${period}.csv"`);
      return this.svc.toCsv(data.rows);
    }
    return data;
  }

  // ── Admin: tax filing usage stats ────────────────────────────────
  @Get("admin/stats")
  @Roles(UserRole.ADMIN)
  async adminTaxStats() {
    return this.svc.getAdminTaxStats();
  }
}

// Public, unauthenticated CA-share read-only endpoint
@Controller("public/tax-share")
export class PublicTaxShareController {
  constructor(private readonly svc: TaxReportsService) {}

  @Get(":token")
  async view(@Param("token") token: string) {
    const { shopId, country, period } = this.svc.verifyShareToken(token);
    const summary = await this.svc.getSummary(shopId, country, period);

    let detail: any = null;
    if (country === "IN") {
      detail = {
        gstr3b: await this.svc.getIndiaGstr3b(shopId, period),
        hsn: await this.svc.getIndiaHsnSummary(shopId, period),
      };
    } else if (country === "NP") {
      detail = await this.svc.getNepalVat(shopId, period);
    } else if (country === "AE") {
      detail = await this.svc.getUaeVat201(shopId, period);
    } else if (country === "GB") {
      detail = await this.svc.getUkMtdNineBox(shopId, period);
    } else if (country === "EU") {
      detail = await this.svc.getEuOss(shopId, period);
    } else if (country === "US") {
      detail = await this.svc.getUsStateSummary(shopId, period);
    }

    return { country, period, summary, detail, sharedAt: new Date() };
  }
}
