import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateGoldLoanDto,
  GoldLoanStatusDto,
  UpdateGoldLoanStatusDto,
} from "./dto/gold-loan.dto";

@Injectable()
export class GoldLoansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a gold loan. Idempotent on `clientId` so an offline queue can
   * replay the same create without producing duplicates.
   */
  async create(shopId: string, dto: CreateGoldLoanDto) {
    if (dto.clientId) {
      const existing = await this.prisma.goldLoan.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing && existing.shopId === shopId) return existing;
    }

    const loanNumber = dto.loanNumber || (await this.nextLoanNumber(shopId));

    return this.prisma.goldLoan.create({
      data: {
        shopId,
        clientId: dto.clientId,
        loanNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        principal: dto.principal,
        interestRate: dto.interestRate,
        rateType: dto.rateType ?? "MONTHLY",
        interestType: dto.interestType ?? "SIMPLE",
        compoundFrequency:
          dto.interestType === "COMPOUND" ? dto.compoundFrequency : null,
        pawnedItems: dto.pawnedItems as unknown as Prisma.InputJsonValue,
        currency: dto.currency ?? "NPR",
        loanDate: dto.loanDate ? new Date(dto.loanDate) : new Date(),
        notes: dto.notes,
      },
    });
  }

  async list(shopId: string, limit = 200) {
    const items = await this.prisma.goldLoan.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 500),
    });
    return { items };
  }

  async updateStatus(
    shopId: string,
    id: string,
    dto: UpdateGoldLoanStatusDto,
  ) {
    const loan = await this.prisma.goldLoan.findFirst({
      where: { id, shopId },
    });
    if (!loan) throw new NotFoundException("Gold loan not found");

    const closing =
      dto.status === GoldLoanStatusDto.REDEEMED ||
      dto.status === GoldLoanStatusDto.DEFAULTED;

    return this.prisma.goldLoan.update({
      where: { id },
      data: {
        status: dto.status,
        redeemedDate: closing
          ? dto.redeemedDate
            ? new Date(dto.redeemedDate)
            : (loan.redeemedDate ?? new Date())
          : null,
      },
    });
  }

  /** Generate the next sequential loan number for the shop (GV-YYYY-NNN). */
  private async nextLoanNumber(shopId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.goldLoan.count({ where: { shopId } });
    return `GV-${year}-${String(count + 1).padStart(3, "0")}`;
  }
}
