import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createScheduledReport(
    shopId: string,
    createdByUserId: string,
    data: {
      reportType: string;
      frequency: string;
      recipients: string[];
      format?: string;
      filters?: Record<string, unknown>;
    },
  ) {
    const nextRunAt = this.calculateNextRun(data.frequency);

    return this.prisma.scheduledReport.create({
      data: {
        shopId,
        reportType: data.reportType as any,
        frequency: data.frequency as any,
        recipients: data.recipients,
        format: (data.format as any) || "PDF",
        filters: data.filters as any,
        nextRunAt,
        createdByUserId,
      },
    });
  }

  async listScheduledReports(shopId: string) {
    return this.prisma.scheduledReport.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateScheduledReport(
    shopId: string,
    reportId: string,
    data: Partial<{
      frequency: string;
      recipients: string[];
      format: string;
      filters: Record<string, unknown>;
      isActive: boolean;
    }>,
  ) {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id: reportId, shopId },
    });
    if (!report) throw new NotFoundException("Report not found");

    return this.prisma.scheduledReport.update({
      where: { id: report.id },
      data: {
        ...(data.frequency && {
          frequency: data.frequency as any,
          nextRunAt: this.calculateNextRun(data.frequency),
        }),
        ...(data.recipients && { recipients: data.recipients }),
        ...(data.format && { format: data.format as any }),
        ...(data.filters && { filters: data.filters as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteScheduledReport(shopId: string, reportId: string) {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id: reportId, shopId },
    });
    if (!report) throw new NotFoundException("Report not found");
    return this.prisma.scheduledReport.delete({ where: { id: report.id } });
  }

  /** Generate an on-demand report (returns data, not file) */
  async generateReport(
    shopId: string,
    reportType: string,
    filters?: Record<string, unknown>,
  ) {
    const dateFrom = (filters?.dateFrom as string) || this.daysAgo(30);
    const dateTo = (filters?.dateTo as string) || new Date().toISOString();

    switch (reportType) {
      case "SALES_SUMMARY":
        return this.generateSalesReport(shopId, dateFrom, dateTo);
      case "INVENTORY_STATUS":
        return this.generateInventoryReport(shopId);
      case "COMMISSION_STATEMENT":
        return this.generateCommissionReport(shopId, dateFrom, dateTo);
      case "CUSTOMER_ANALYTICS":
        return this.generateCustomerReport(shopId, dateFrom, dateTo);
      default:
        return { reportType, shopId, note: "Report type coming soon" };
    }
  }

  // ─── Report generators ─────────────────────────

  private async generateSalesReport(shopId: string, from: string, to: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: new Date(from), lte: new Date(to) },
        status: { in: ["DELIVERED", "COMPLETED"] as any[] },
      },
      select: {
        id: true,
        totalNpr: true,
        displayCurrency: true,
        status: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalNpr || 0), 0);
    const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;

    return {
      reportType: "SALES_SUMMARY",
      period: { from, to },
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      orders,
    };
  }

  private async generateInventoryReport(shopId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { shopId },
      select: {
        id: true,
        nameEn: true,
        stockQuantity: true,
        status: true,
        jewelleryType: true,
        createdAt: true,
      },
    });

    const lowStock = items.filter((i) => (i.stockQuantity || 0) <= 5);
    const outOfStock = items.filter((i) => (i.stockQuantity || 0) === 0);

    return {
      reportType: "INVENTORY_STATUS",
      totalItems: items.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: lowStock,
    };
  }

  private async generateCommissionReport(shopId: string, from: string, to: string) {
    const commissions = await this.prisma.commissionLedger.findMany({
      where: {
        shopId,
        createdAt: { gte: new Date(from), lte: new Date(to) },
      },
      select: {
        id: true,
        amount: true,
        commissionRate: true,
        status: true,
        createdAt: true,
      },
    });

    const totalCommission = commissions.reduce(
      (sum, c) => sum + (c.amount || 0),
      0,
    );

    return {
      reportType: "COMMISSION_STATEMENT",
      period: { from, to },
      totalEntries: commissions.length,
      totalCommission,
      entries: commissions,
    };
  }

  private async generateCustomerReport(shopId: string, from: string, to: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: new Date(from), lte: new Date(to) },
      },
      select: { customerId: true, totalNpr: true },
    });

    const uniqueCustomers = new Set(orders.map((o) => o.customerId)).size;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalNpr || 0), 0);

    return {
      reportType: "CUSTOMER_ANALYTICS",
      period: { from, to },
      uniqueCustomers,
      totalOrders: orders.length,
      totalRevenue,
      avgRevenuePerCustomer: uniqueCustomers
        ? Math.round((totalRevenue / uniqueCustomers) * 100) / 100
        : 0,
    };
  }

  // ─── Scheduling helpers ────────────────────────

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case "DAILY":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "WEEKLY":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "BIWEEKLY":
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      case "MONTHLY":
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case "QUARTERLY":
        return new Date(now.getFullYear(), now.getMonth() + 3, 1);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private daysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }
}
