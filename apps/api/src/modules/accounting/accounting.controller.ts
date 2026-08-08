import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AccountingService } from "./accounting.service";

@Controller("accounting")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  private authorizeShop(
    shopId: string,
    userShopId: string | undefined,
    role: UserRole,
  ) {
    if (role !== UserRole.ADMIN && (!userShopId || userShopId !== shopId)) {
      throw new ForbiddenException("You can only access your own shop ledger");
    }
  }

  private date(value: string | undefined, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException("Invalid ledger date filter");
    }
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      parsed.setUTCHours(23, 59, 59, 999);
    }
    return parsed;
  }

  private range(from?: string, to?: string) {
    const range = { from: this.date(from), to: this.date(to, true) };
    if (range.from && range.to && range.from > range.to) {
      throw new BadRequestException("Ledger from date must not exceed to date");
    }
    return range;
  }

  @Get("shops/:shopId/accounts")
  async accounts(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") role: UserRole,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    this.authorizeShop(shopId, userShopId, role);
    return this.accounting.getChartOfAccounts(shopId, this.range(from, to));
  }

  @Get("shops/:shopId/trial-balance")
  async trialBalance(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") role: UserRole,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    this.authorizeShop(shopId, userShopId, role);
    return this.accounting.getTrialBalance(shopId, this.range(from, to));
  }

  @Get("shops/:shopId/ledger")
  async ledger(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") role: UserRole,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    this.authorizeShop(shopId, userShopId, role);
    return this.accounting.getShopLedger(shopId, {
      ...this.range(from, to),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("shops/:shopId/general-ledger")
  async generalLedger(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") role: UserRole,
    @Query("accountId") accountId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    this.authorizeShop(shopId, userShopId, role);
    return this.accounting.getGeneralLedger(shopId, {
      ...this.range(from, to),
      accountId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("shops/:shopId/journals/:journalId")
  async journalDetail(
    @Param("shopId") shopId: string,
    @Param("journalId") journalId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") role: UserRole,
  ) {
    this.authorizeShop(shopId, userShopId, role);
    return this.accounting.getJournalDetail(shopId, journalId);
  }
}
