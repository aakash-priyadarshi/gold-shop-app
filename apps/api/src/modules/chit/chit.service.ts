import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ChitCycleStatus, ChitGroupStatus, CurrencyCode } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AddChitMemberDto,
  CreateChitGroupDto,
  DeclareChitWinnerDto,
  OpenChitCycleDto,
  RecordChitPaymentDto,
} from "./dto/chit.dto";

@Injectable()
export class ChitService {
  constructor(private prisma: PrismaService) {}

  private async getOwnedGroup(shopId: string, groupId: string) {
    const group = await this.prisma.chitGroup.findFirst({
      where: { id: groupId, shopId },
    });
    if (!group) throw new NotFoundException("Chit group not found");
    return group;
  }

  async createGroup(shopId: string, dto: CreateChitGroupDto) {
    if (!shopId) throw new BadRequestException("Shop required");
    const installmentAmount =
      dto.installmentAmount ??
      Number((dto.chitValue / dto.memberSlots).toFixed(2));
    if (installmentAmount <= 0) {
      throw new BadRequestException("Installment amount must be positive");
    }

    return this.prisma.chitGroup.create({
      data: {
        shopId,
        name: dto.name.trim(),
        chitValue: dto.chitValue,
        memberSlots: dto.memberSlots,
        installmentAmount,
        foremanCommissionPercent: dto.foremanCommissionPercent ?? 0,
        currency: dto.currency ?? CurrencyCode.NPR,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      },
      include: { members: true, cycles: true },
    });
  }

  async listGroups(shopId: string, status?: string) {
    if (!shopId) return { groups: [] };
    const groups = await this.prisma.chitGroup.findMany({
      where: {
        shopId,
        ...(status ? { status: status as ChitGroupStatus } : {}),
      },
      include: {
        members: { orderBy: { ticketNumber: "asc" } },
        cycles: { orderBy: { cycleNumber: "desc" }, take: 1 },
        _count: { select: { members: true, cycles: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { groups };
  }

  async getGroup(shopId: string, groupId: string) {
    const group = await this.prisma.chitGroup.findFirst({
      where: { id: groupId, shopId },
      include: {
        members: { orderBy: { ticketNumber: "asc" } },
        cycles: {
          orderBy: { cycleNumber: "asc" },
          include: {
            payments: true,
            winner: { select: { id: true, customerName: true, ticketNumber: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException("Chit group not found");

    const openCycle = group.cycles.find((c) => c.status === ChitCycleStatus.OPEN);
    const arrears = openCycle
      ? group.members.filter(
          (m) => !openCycle.payments.some((p) => p.memberId === m.id),
        )
      : [];

    return { group, openCycle: openCycle || null, arrears };
  }

  async addMember(shopId: string, groupId: string, dto: AddChitMemberDto) {
    const group = await this.getOwnedGroup(shopId, groupId);
    if (group.status !== ChitGroupStatus.ACTIVE) {
      throw new BadRequestException("Cannot add members to an inactive group");
    }

    const memberCount = await this.prisma.chitMember.count({ where: { groupId } });
    if (memberCount >= group.memberSlots) {
      throw new BadRequestException("All member slots are filled");
    }

    let ticketNumber = dto.ticketNumber;
    if (!ticketNumber) {
      const last = await this.prisma.chitMember.findFirst({
        where: { groupId },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });
      ticketNumber = (last?.ticketNumber ?? 0) + 1;
    }
    if (ticketNumber < 1 || ticketNumber > group.memberSlots) {
      throw new BadRequestException("Ticket number out of range");
    }

    try {
      return await this.prisma.chitMember.create({
        data: {
          groupId,
          ticketNumber,
          customerName: dto.customerName.trim(),
          customerPhone: dto.customerPhone?.trim() || null,
        },
      });
    } catch {
      throw new BadRequestException("Ticket number already taken");
    }
  }

  async openCycle(shopId: string, groupId: string, dto: OpenChitCycleDto) {
    const group = await this.getOwnedGroup(shopId, groupId);
    if (group.status !== ChitGroupStatus.ACTIVE) {
      throw new BadRequestException("Group is not active");
    }

    const memberCount = await this.prisma.chitMember.count({ where: { groupId } });
    if (memberCount < 2) {
      throw new BadRequestException("Add at least 2 members before opening a cycle");
    }

    const open = await this.prisma.chitCycle.findFirst({
      where: { groupId, status: ChitCycleStatus.OPEN },
    });
    if (open) {
      throw new BadRequestException("An open cycle already exists — close it first");
    }

    const last = await this.prisma.chitCycle.findFirst({
      where: { groupId },
      orderBy: { cycleNumber: "desc" },
      select: { cycleNumber: true },
    });
    const cycleNumber = (last?.cycleNumber ?? 0) + 1;
    if (cycleNumber > group.memberSlots) {
      throw new BadRequestException("All cycles for this group are complete");
    }

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d;
        })();

    return this.prisma.chitCycle.create({
      data: { groupId, cycleNumber, dueDate },
    });
  }

  async listCycles(shopId: string, groupId: string) {
    await this.getOwnedGroup(shopId, groupId);
    const cycles = await this.prisma.chitCycle.findMany({
      where: { groupId },
      include: {
        payments: true,
        winner: { select: { id: true, customerName: true, ticketNumber: true } },
      },
      orderBy: { cycleNumber: "asc" },
    });
    return { cycles };
  }

  async recordPayment(
    shopId: string,
    groupId: string,
    cycleId: string,
    dto: RecordChitPaymentDto,
  ) {
    const group = await this.getOwnedGroup(shopId, groupId);
    const cycle = await this.prisma.chitCycle.findFirst({
      where: { id: cycleId, groupId },
    });
    if (!cycle) throw new NotFoundException("Cycle not found");
    if (cycle.status !== ChitCycleStatus.OPEN) {
      throw new BadRequestException("Cycle is closed");
    }

    const member = await this.prisma.chitMember.findFirst({
      where: { id: dto.memberId, groupId },
    });
    if (!member) throw new NotFoundException("Member not found in this group");

    if (dto.clientId) {
      const existing = await this.prisma.chitCyclePayment.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) return existing;
    }

    const amount = dto.amount ?? group.installmentAmount;
    try {
      return await this.prisma.chitCyclePayment.create({
        data: {
          cycleId,
          memberId: dto.memberId,
          amount,
          clientId: dto.clientId,
        },
      });
    } catch {
      const existing = await this.prisma.chitCyclePayment.findUnique({
        where: {
          cycleId_memberId: { cycleId, memberId: dto.memberId },
        },
      });
      if (existing) return existing;
      throw new BadRequestException("Could not record payment");
    }
  }

  async declareWinner(
    shopId: string,
    groupId: string,
    cycleId: string,
    dto: DeclareChitWinnerDto,
  ) {
    const group = await this.getOwnedGroup(shopId, groupId);
    const cycle = await this.prisma.chitCycle.findFirst({
      where: { id: cycleId, groupId },
      include: { payments: true },
    });
    if (!cycle) throw new NotFoundException("Cycle not found");
    if (cycle.status !== ChitCycleStatus.OPEN) {
      throw new BadRequestException("Cycle is already closed");
    }

    const winner = await this.prisma.chitMember.findFirst({
      where: { id: dto.winnerMemberId, groupId },
    });
    if (!winner) throw new NotFoundException("Winner not found in this group");
    if (winner.hasWon) {
      throw new BadRequestException("This member has already won a previous cycle");
    }

    const pot = group.installmentAmount * group.memberSlots;
    const foremanCommission = Number(
      ((pot * (group.foremanCommissionPercent || 0)) / 100).toFixed(2),
    );
    const netPrize = Number((pot - foremanCommission).toFixed(2));

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.chitMember.update({
        where: { id: winner.id },
        data: { hasWon: true, wonCycleNumber: cycle.cycleNumber },
      });
      const closed = await tx.chitCycle.update({
        where: { id: cycle.id },
        data: {
          status: ChitCycleStatus.CLOSED,
          winnerMemberId: winner.id,
          netPrize,
          foremanCommission,
          closedAt: new Date(),
        },
        include: {
          winner: true,
          payments: true,
        },
      });

      const closedCount = await tx.chitCycle.count({
        where: { groupId, status: ChitCycleStatus.CLOSED },
      });
      if (closedCount >= group.memberSlots) {
        await tx.chitGroup.update({
          where: { id: groupId },
          data: { status: ChitGroupStatus.COMPLETED },
        });
      }
      return closed;
    });

    return updated;
  }

  async getArrears(shopId: string, groupId: string) {
    const detail = await this.getGroup(shopId, groupId);
    return {
      openCycle: detail.openCycle,
      arrears: detail.arrears,
      installmentAmount: detail.group.installmentAmount,
      currency: detail.group.currency,
    };
  }
}
