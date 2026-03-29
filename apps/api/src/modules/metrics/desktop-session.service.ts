import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DesktopSessionService {
  private readonly logger = new Logger(DesktopSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Called when desktop app opens */
  async startSession(data: {
    userId?: string;
    ipAddress: string;
    appVersion: string;
    os: string;
    arch?: string;
  }) {
    const sessionToken = randomUUID();
    await this.prisma.desktopSession.create({
      data: {
        userId: data.userId || null,
        sessionToken,
        ipAddress: data.ipAddress,
        appVersion: data.appVersion,
        os: data.os,
        arch: data.arch,
        isActive: true,
      },
    });
    return { sessionToken };
  }

  /** Heartbeat every 60s from Tauri app */
  async heartbeat(sessionToken: string) {
    await this.prisma.desktopSession.updateMany({
      where: { sessionToken, endedAt: null },
      data: { lastHeartbeat: new Date(), isActive: true },
    });
  }

  /** Called on app quit or window close */
  async endSession(sessionToken: string, closedBy: string = 'user_quit') {
    const session = await this.prisma.desktopSession.findUnique({
      where: { sessionToken },
    });
    if (!session || session.endedAt) return;

    const endedAt = new Date();
    const durationSec = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    await this.prisma.desktopSession.update({
      where: { sessionToken },
      data: { endedAt, durationSec, isActive: false, closedBy },
    });

    this.logger.debug(`Desktop session ended: ${sessionToken} (${durationSec}s)`);
  }

  /** Admin: aggregated desktop usage stats */
  async getAdminStats(period: 'daily' | 'monthly' | 'yearly') {
    const now = new Date();
    let startFrom: Date;
    let groupFormat: string;

    if (period === 'daily') {
      startFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'monthly') {
      startFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      groupFormat = 'YYYY-MM';
    } else {
      startFrom = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
      groupFormat = 'YYYY';
    }

    const [totalSessions, byOs, byVersion, avgDuration, recentSessions, activeSessions] = await Promise.all([
      this.prisma.desktopSession.count({ where: { startedAt: { gte: startFrom } } }),
      this.prisma.desktopSession.groupBy({
        by: ['os'],
        where: { startedAt: { gte: startFrom } },
        _count: { id: true },
      }),
      this.prisma.desktopSession.groupBy({
        by: ['appVersion'],
        where: { startedAt: { gte: startFrom } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.desktopSession.aggregate({
        where: { startedAt: { gte: startFrom }, durationSec: { not: null } },
        _avg: { durationSec: true },
      }),
      this.prisma.desktopSession.findMany({
        where: { startedAt: { gte: startFrom } },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.desktopSession.count({ where: { isActive: true } }),
    ]);

    return {
      period,
      totalSessions,
      activeSessions,
      avgDurationSec: Math.round(avgDuration._avg.durationSec ?? 0),
      byOs: byOs.map(o => ({ os: o.os, _count: { id: o._count.id } })),
      byVersion: byVersion.map(v => ({ appVersion: v.appVersion, _count: { id: v._count.id } })),
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        os: s.os,
        appVersion: s.appVersion,
        arch: s.arch,
        firstSeen: s.startedAt,
        lastSeen: s.lastHeartbeat ?? s.startedAt,
        user: s.user,
      })),
    };
  }
}
