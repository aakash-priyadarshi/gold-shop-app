import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { LeadSource, LeadStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BulkUpdateLeadStatusDto,
  GetLeadsFilterDto,
  ImportLeadsDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { OUTREACH_TEMPLATES } from "./leads-outreach.service";

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getOutreachPresets() {
    return OUTREACH_TEMPLATES;
  }

  async getLeads(filter: GetLeadsFilterDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(Math.max(1, filter.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};

    if (filter.status && filter.status !== "ALL") {
      if (Object.values(LeadStatus).includes(filter.status as LeadStatus)) {
        where.status = filter.status as LeadStatus;
      }
    }

    if (filter.source && filter.source !== "ALL") {
      if (Object.values(LeadSource).includes(filter.source as LeadSource)) {
        where.source = filter.source as LeadSource;
      }
    }

    if (filter.country && filter.country !== "ALL") {
      where.country = filter.country.toUpperCase();
    }

    if (filter.city?.trim()) {
      where.city = { contains: filter.city.trim(), mode: "insensitive" };
    }

    if (filter.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { shopName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [leads, total, stats] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
      this.computeLeadStats(),
    ]);

    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    };
  }

  private async computeLeadStats() {
    const [totalAll, newCount, contactedCount, wonCount, lostCount, mapsCount, chatCount] =
      await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
        this.prisma.lead.count({ where: { status: LeadStatus.CONTACTED } }),
        this.prisma.lead.count({ where: { status: LeadStatus.WON } }),
        this.prisma.lead.count({ where: { status: LeadStatus.LOST } }),
        this.prisma.lead.count({ where: { source: LeadSource.GOOGLE_MAPS } }),
        this.prisma.lead.count({ where: { source: LeadSource.AI_CHATBOT } }),
      ]);

    return {
      totalAll,
      newCount,
      contactedCount,
      wonCount,
      lostCount,
      mapsCount,
      chatCount,
    };
  }

  async importLeads(dto: ImportLeadsDto): Promise<{
    imported: number;
    updated: number;
    skipped: number;
  }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of dto.leads) {
      if (!item.shopName?.trim()) {
        skipped++;
        continue;
      }

      const cleanEmail = item.email?.trim().toLowerCase() || null;
      const cleanPhone = item.phone?.trim() || null;

      try {
        let existing = null;
        if (cleanEmail) {
          existing = await this.prisma.lead.findFirst({
            where: { email: cleanEmail },
          });
        }
        if (!existing && cleanPhone) {
          existing = await this.prisma.lead.findFirst({
            where: { phone: cleanPhone },
          });
        }

        if (existing) {
          await this.prisma.lead.update({
            where: { id: existing.id },
            data: {
              phone: existing.phone || cleanPhone || undefined,
              email: existing.email || cleanEmail || undefined,
              website: existing.website || item.website || undefined,
              address: existing.address || item.address || undefined,
              city: existing.city || item.city || undefined,
              state: existing.state || item.state || undefined,
              rating: existing.rating ?? item.rating ?? undefined,
              reviewCount: existing.reviewCount ?? item.reviewCount ?? undefined,
              metadata: (item.metadata || existing.metadata) as any,
            },
          });
          updated++;
        } else {
          await this.prisma.lead.create({
            data: {
              shopName: item.shopName.trim(),
              contactName: item.contactName?.trim() || null,
              email: cleanEmail,
              phone: cleanPhone,
              website: item.website?.trim() || null,
              address: item.address?.trim() || null,
              city: item.city?.trim() || null,
              state: item.state?.trim() || null,
              country: (item.country || "NP").toUpperCase(),
              source: item.source || LeadSource.GOOGLE_MAPS,
              status: item.status || LeadStatus.NEW,
              rating: item.rating ?? null,
              reviewCount: item.reviewCount ?? null,
              metadata: item.metadata as any,
            },
          });
          imported++;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to import lead ${item.shopName}: ${err?.message}`);
        skipped++;
      }
    }

    return { imported, updated, skipped };
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Lead not found");
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        notes: dto.notes ?? undefined,
        shopName: dto.shopName?.trim() ?? undefined,
        email: dto.email?.trim().toLowerCase() ?? undefined,
        phone: dto.phone?.trim() ?? undefined,
      },
    });
  }

  async bulkUpdateStatus(dto: BulkUpdateLeadStatusDto) {
    const result = await this.prisma.lead.updateMany({
      where: { id: { in: dto.ids } },
      data: { status: dto.status },
    });
    return { count: result.count, status: dto.status };
  }

  async deleteLead(id: string) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Lead not found");
    }
    return this.prisma.lead.delete({ where: { id } });
  }
}
