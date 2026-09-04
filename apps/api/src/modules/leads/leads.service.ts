import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { LeadSource, LeadStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BulkUpdateLeadStatusDto,
  GetLeadsFilterDto,
  ImportLeadsDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { OUTREACH_TEMPLATES } from "./leads-outreach.service";
import { normalizeWhatsAppNumber } from "./leads-whatsapp.service";

@Injectable()
export class LeadsService implements OnModuleInit {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.backfillLeadPhones().catch((err) =>
      this.logger.warn(`Failed to backfill lead phone numbers: ${err?.message}`)
    );
  }

  private async backfillLeadPhones(): Promise<void> {
    try {
      const leadsWithPhone = await this.prisma.lead.findMany({
        where: {
          phone: { not: null },
        },
        select: { id: true, phone: true, country: true },
      });

      for (const lead of leadsWithPhone) {
        if (!lead.phone || lead.phone.startsWith("+")) continue;
        const normalized = normalizeWhatsAppNumber(lead.phone, lead.country);
        if (normalized && normalized !== lead.phone) {
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { phone: normalized },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Lead phone backfill skipped or failed: ${err?.message}`);
    }
  }

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
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          _count: {
            select: { messages: true },
          },
        },
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

      const country = (item.country || "NP").toUpperCase();
      const cleanEmail = item.email?.trim().toLowerCase() || null;
      const cleanPhone = item.phone
        ? normalizeWhatsAppNumber(item.phone, country) || item.phone.trim()
        : null;

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
              country,
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

    const normalizedPhone = dto.phone
      ? normalizeWhatsAppNumber(dto.phone, existing.country) || dto.phone.trim()
      : undefined;

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        notes: dto.notes ?? undefined,
        shopName: dto.shopName?.trim() ?? undefined,
        email: dto.email?.trim().toLowerCase() ?? undefined,
        phone: normalizedPhone,
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

  async getLeadMessages(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found");
    }
    return {
      lead: {
        id: lead.id,
        shopName: lead.shopName,
        phone: lead.phone,
        city: lead.city,
        country: lead.country,
        aiBotPaused: lead.aiBotPaused,
        whatsappOptOut: lead.whatsappOptOut,
        customerServiceWindowExpiresAt: lead.customerServiceWindowExpiresAt,
      },
      messages: lead.messages,
    };
  }

  async toggleAiBot(leadId: string, paused: boolean) {
    const existing = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!existing) {
      throw new NotFoundException("Lead not found");
    }
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { aiBotPaused: paused },
    });
  }
}

