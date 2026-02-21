import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createImportJob(
    shopId: string,
    createdByUserId: string,
    data: {
      importType: string;
      fileUrl: string;
    },
  ) {
    return this.prisma.bulkImportJob.create({
      data: {
        shopId,
        importType: data.importType as any,
        fileUrl: data.fileUrl,
        createdByUserId,
      },
    });
  }

  async listImportJobs(shopId: string, limit = 20) {
    return this.prisma.bulkImportJob.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getImportJob(shopId: string, jobId: string) {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, shopId },
    });
    if (!job) throw new NotFoundException("Import job not found");
    return job;
  }

  /**
   * Process an import job. In production this would be handled by a Bull queue.
   * This method provides the processing logic outline.
   */
  async processImportJob(jobId: string) {
    const job = await this.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException("Import job not found");

    await this.prisma.bulkImportJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    try {
      // TODO: Download file from R2, parse CSV/Excel, process rows
      // For now, mark as completed with placeholder
      const result = await this.processRows(job);

      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          totalRows: result.totalRows,
          processedRows: result.processedRows,
          successRows: result.successRows,
          failedRows: result.failedRows,
          errorLog: result.errors as any,
        },
      });
    } catch (error) {
      this.logger.error(`Import job ${jobId} failed: ${error.message}`);
      await this.prisma.bulkImportJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorLog: [{ row: 0, field: "system", message: error.message }] as any,
        },
      });
    }
  }

  async cancelImportJob(shopId: string, jobId: string) {
    const job = await this.prisma.bulkImportJob.findFirst({
      where: { id: jobId, shopId, status: "PENDING" },
    });
    if (!job) throw new NotFoundException("Pending import job not found");

    return this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * Export data as JSON (CSV/Excel conversion would be handled by a Bull job in production).
   */
  async exportData(
    shopId: string,
    exportType: string,
    filters?: Record<string, unknown>,
  ) {
    switch (exportType) {
      case "INVENTORY_ITEMS":
        return this.exportInventory(shopId);
      case "CUSTOMER_LIST":
        return this.exportCustomers(shopId);
      case "PRICE_SHEET":
        return this.exportPriceSheet(shopId);
      default:
        return { exportType, note: "Export type coming soon" };
    }
  }

  private async exportInventory(shopId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { shopId },
      select: {
        id: true,
        nameEn: true,
        sku: true,
        jewelleryType: true,
        buildMethod: true,
        composition: true,
        totalWeightGrams: true,
        stockQuantity: true,
        status: true,
      },
    });
    return { exportType: "INVENTORY_ITEMS", count: items.length, data: items };
  }

  private async exportCustomers(shopId: string) {
    const orders = await this.prisma.order.findMany({
      where: { shopId },
      select: {
        customerId: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      distinct: ["customerId"],
    });
    const customers = orders.map((o) => o.customer);
    return { exportType: "CUSTOMER_LIST", count: customers.length, data: customers };
  }

  private async exportPriceSheet(shopId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { shopId },
      select: {
        id: true,
        nameEn: true,
        sku: true,
        jewelleryType: true,
        composition: true,
        totalWeightGrams: true,
        totalPriceNpr: true,
        metalValueNpr: true,
      },
    });
    return { exportType: "PRICE_SHEET", count: items.length, data: items };
  }

  private async processRows(job: any) {
    // Placeholder — real implementation would parse the file
    return {
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: [],
    };
  }
}
