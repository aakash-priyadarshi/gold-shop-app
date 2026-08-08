import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import type { SavingsMember } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  EnrollSavingsMemberDto,
  RecordSavingsPaymentDto,
  SavingsMemberStatusDto,
  SavingsSchemeTypeDto,
} from "./dto/savings.dto";

@Injectable()
export class SavingsService {
  constructor(private prisma: PrismaService) {}

  /** Add the derived monetary fields the mobile UI expects. */
  private decorate(member: SavingsMember) {
    const totalSaved = member.installmentAmount * member.totalInstallments;
    const bonusAmount = member.installmentAmount * member.bonusInstallments;
    return {
      ...member,
      totalSaved,
      bonusAmount,
      payoutTotal: totalSaved + bonusAmount,
    };
  }

  private computeMaturityDate(
    start: Date,
    schemeType: SavingsSchemeTypeDto,
    totalInstallments: number,
  ): Date {
    const d = new Date(start);
    if (schemeType === SavingsSchemeTypeDto.DAILY) {
      d.setDate(d.getDate() + totalInstallments);
    } else if (schemeType === SavingsSchemeTypeDto.WEEKLY) {
      d.setDate(d.getDate() + totalInstallments * 7);
    } else {
      d.setMonth(d.getMonth() + totalInstallments);
    }
    return d;
  }

  /**
   * Enroll a member. Idempotent on `clientId` so an offline queue can replay
   * the same enrollment without producing duplicates.
   */
  async enroll(shopId: string, dto: EnrollSavingsMemberDto) {
    if (dto.clientId) {
      const existing = await this.prisma.savingsMember.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing && existing.shopId === shopId) {
        return this.decorate(existing);
      }
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const maturityDate = this.computeMaturityDate(
      startDate,
      dto.schemeType,
      dto.totalInstallments,
    );

    const member = await this.prisma.savingsMember.create({
      data: {
        shopId,
        clientId: dto.clientId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        schemeType: dto.schemeType,
        installmentAmount: dto.installmentAmount,
        totalInstallments: dto.totalInstallments,
        bonusInstallments: dto.bonusInstallments ?? 0,
        currency: dto.currency ?? "NPR",
        startDate,
        maturityDate,
      },
    });
    return this.decorate(member);
  }

  async list(shopId: string, status?: string, limit = 50) {
    const members = await this.prisma.savingsMember.findMany({
      where: {
        shopId,
        ...(status ? { status: status as SavingsMemberStatusDto } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return { members: members.map((m) => this.decorate(m)) };
  }

  /**
   * Record one installment payment. Idempotent on `clientId`: a replayed
   * offline payment for the same clientId will not double-count.
   */
  async recordPayment(
    shopId: string,
    memberId: string,
    dto: RecordSavingsPaymentDto,
  ) {
    const member = await this.prisma.savingsMember.findFirst({
      where: { id: memberId, shopId },
    });
    if (!member) throw new NotFoundException("Savings member not found");

    if (dto.clientId) {
      const existing = await this.prisma.savingsPayment.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing && existing.memberId === memberId) {
        return this.decorate(member);
      }
    }

    const amount = dto.amount ?? member.installmentAmount;
    const nextPaid = Math.min(
      member.installmentsPaid + 1,
      member.totalInstallments,
    );
    const matured = nextPaid >= member.totalInstallments;

    const [, updated] = await this.prisma.$transaction([
      this.prisma.savingsPayment.create({
        data: { memberId, clientId: dto.clientId, amount },
      }),
      this.prisma.savingsMember.update({
        where: { id: memberId },
        data: {
          installmentsPaid: nextPaid,
          ...(matured && member.status === "ACTIVE"
            ? { status: "MATURED" }
            : {}),
        },
      }),
    ]);

    return this.decorate(updated);
  }

  /**
   * Mark a matured (or active) scheme as redeemed when the customer
   * collects jewellery / payout at the counter.
   */
  async redeem(shopId: string, memberId: string) {
    const member = await this.prisma.savingsMember.findFirst({
      where: { id: memberId, shopId },
    });
    if (!member) throw new NotFoundException("Savings member not found");

    if (member.status === "REDEEMED") {
      return this.decorate(member);
    }
    if (member.status === "CANCELLED") {
      throw new BadRequestException("Cannot redeem a cancelled scheme");
    }

    const updated = await this.prisma.savingsMember.update({
      where: { id: memberId },
      data: { status: "REDEEMED" },
    });
    return this.decorate(updated);
  }
}
