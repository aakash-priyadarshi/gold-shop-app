import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  actorType?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // Log an action (immutable)
  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        actorType: entry.actorType || 'USER',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  // Batch log multiple entries
  async logBatch(entries: AuditLogEntry[]) {
    return this.prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId,
        actorType: entry.actorType || 'USER',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      })),
    });
  }

  // Get audit trail for an entity
  async getEntityAuditTrail(resourceType: string, resourceId: string) {
    return this.prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  // Get user activity log
  async getUserActivity(
    userId: string,
    options: { page?: number; limit?: number; action?: string } = {},
  ) {
    const { page = 1, limit = 50, action } = options;

    const where: any = { userId };
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Search audit logs
  async search(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get audit statistics
  async getStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      actionBreakdown,
      entityBreakdown,
      dailyActivity,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      this.prisma.auditLog.groupBy({
        by: ['resourceType'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      this.prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
    ]);

    return {
      totalLogs,
      actionBreakdown: actionBreakdown.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      entityBreakdown: entityBreakdown.map((e) => ({
        resourceType: e.resourceType,
        count: e._count,
      })),
      dailyActivity,
    };
  }

  // Common audit action helpers
  async logCreate(
    userId: string,
    resourceType: string,
    resourceId: string,
    data: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: 'CREATE',
      resourceType,
      resourceId,
      newValue: data,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }

  async logUpdate(
    userId: string,
    resourceType: string,
    resourceId: string,
    oldData: any,
    newData: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: 'UPDATE',
      resourceType,
      resourceId,
      previousValue: oldData,
      newValue: newData,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }

  async logDelete(
    userId: string,
    resourceType: string,
    resourceId: string,
    data: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: 'DELETE',
      resourceType,
      resourceId,
      previousValue: data,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }

  async logLogin(
    userId: string,
    success: boolean,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resourceType: 'SESSION',
      resourceId: userId,
      metadata: { timestamp: new Date().toISOString() },
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }

  async logPayment(
    userId: string,
    paymentId: string,
    action: string,
    data: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: `PAYMENT_${action}`,
      resourceType: 'PAYMENT',
      resourceId: paymentId,
      newValue: data,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }

  async logStatusChange(
    userId: string,
    resourceType: string,
    resourceId: string,
    fromStatus: string,
    toStatus: string,
    request?: { ip?: string; userAgent?: string },
  ) {
    return this.log({
      userId,
      actorType: 'USER',
      action: 'STATUS_CHANGE',
      resourceType,
      resourceId,
      previousValue: { status: fromStatus },
      newValue: { status: toStatus },
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
  }
}
