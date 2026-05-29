import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateRepairDto,
  RepairStatusDto,
  UpdateRepairStatusDto,
} from "./dto/repair.dto";

@Injectable()
export class RepairsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a repair job. Idempotent on `clientId` so an offline queue can
   * replay the same create without producing duplicates.
   */
  async create(shopId: string, dto: CreateRepairDto) {
    if (dto.clientId) {
      const existing = await this.prisma.repairJob.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) {
        // Replayed offline op — only honour it if it belongs to this shop.
        if (existing.shopId === shopId) return existing;
      }
    }

    return this.prisma.repairJob.create({
      data: {
        shopId,
        clientId: dto.clientId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        itemDescription: dto.itemDescription,
        issueDescription: dto.issueDescription,
        estimatedCost: dto.estimatedCost,
        expectedReadyDate: dto.expectedReadyDate
          ? new Date(dto.expectedReadyDate)
          : undefined,
        notes: dto.notes,
        status: dto.status ?? RepairStatusDto.RECEIVED,
      },
    });
  }

  async list(shopId: string, limit = 50) {
    const items = await this.prisma.repairJob.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return { items };
  }

  async updateStatus(shopId: string, id: string, dto: UpdateRepairStatusDto) {
    const job = await this.prisma.repairJob.findFirst({
      where: { id, shopId },
    });
    if (!job) throw new NotFoundException("Repair job not found");

    return this.prisma.repairJob.update({
      where: { id },
      data: {
        status: dto.status,
        finalCost:
          dto.status === RepairStatusDto.DELIVERED
            ? (dto.finalCost ?? job.finalCost ?? job.estimatedCost)
            : dto.finalCost,
      },
    });
  }
}
