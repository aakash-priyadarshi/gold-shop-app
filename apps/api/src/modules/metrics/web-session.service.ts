import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebSessionService {
  private readonly logger = new Logger(WebSessionService.name);
  private readonly INACTIVITY_TIMEOUT_MINUTES = 30;

  constructor(private readonly prisma: PrismaService) {}

  /** Start a new web session */
  async startSession(data: {
    userId?: string;
    role?: string;
    sessionToken: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
  }) {
    const session = await this.prisma.webSession.create({
      data: {
        userId: data.userId || null,
        sessionToken: data.sessionToken,
        role: data.role || 'guest',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referrer: data.referrer,
        country: data.country,
        lastActive: new Date(),
      },
    });
    return { sessionToken: session.sessionToken };
  }

  /** Record a per-page visit: path, optional title, time spent */
  async recordPageView(data: {
    sessionToken: string;
    path: string;
    title?: string;
    durationSec?: number;
  }) {
    const session = await this.prisma.webSession.findUnique({
      where: { sessionToken: data.sessionToken },
      select: { id: true, endedAt: true },
    });
    if (!session) return;

    // Sanitise path — strip query strings and hash, keep only the pathname
    const safePath = data.path.split('?')[0].split('#')[0].substring(0, 300);

    await this.prisma.$transaction([
      this.prisma.sessionPageView.create({
        data: {
          sessionId: session.id,
          path: safePath,
          title: data.title ? data.title.substring(0, 200) : null,
          durationSec: data.durationSec ?? null,
        },
      }),
      // Keep the aggregate pageViews counter in sync
      this.prisma.webSession.update({
        where: { id: session.id },
        data: {
          pageViews: { increment: 1 },
          lastActive: new Date(),
        },
      }),
    ]);
  }

  /** Heartbeat — update lastActive and duration, NO longer increments pageViews (recordPageView does that) */
  async heartbeat(_data: { sessionToken: string; userId?: string; role?: string }) {
    const session = await this.prisma.webSession.findUnique({
      where: { sessionToken: _data.sessionToken }
    });
    if (!session || session.endedAt) return;

    const now = new Date();
    const durationSec = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

    const dataToUpdate: any = {
      lastActive: now,
      pageViews: { increment: 1 },
      durationSec,
    };

    // Link session to user if they just logged in mid-session
    if (_data.userId) {
      dataToUpdate.userId = _data.userId;
      dataToUpdate.role = _data.role || 'CUSTOMER';
    }

    await this.prisma.webSession.update({
      where: { sessionToken: _data.sessionToken },
      data: dataToUpdate,
    });
  }

  /** End a session: set endedAt, compute duration */
  async endSession(sessionToken: string, closedBy: string = 'beacon') {
    const session = await this.prisma.webSession.findUnique({
      where: { sessionToken },
    });
    if (!session || session.endedAt) return;

    const endedAt = new Date();
    const durationSec = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    await this.prisma.webSession.update({
      where: { sessionToken },
      data: { endedAt, durationSec, closedBy },
    });
  }

  /** Admin: aggregated session stats */
  async getAdminStats(period: 'daily' | 'monthly' | 'yearly') {
    const now = new Date();
    let startFrom: Date;
    let groupFormat: string;

    if (period === 'daily') {
      startFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
      groupFormat = 'YYYY-MM-DD';
    } else if (period === 'monthly') {
      startFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // last 12 months
      groupFormat = 'YYYY-MM';
    } else {
      startFrom = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000); // last 3 years
      groupFormat = 'YYYY';
    }

    const [totalSessions, avgDuration, byRole, timeline] = await Promise.all([
      this.prisma.webSession.count({ where: { startedAt: { gte: startFrom } } }),
      this.prisma.webSession.aggregate({
        where: { startedAt: { gte: startFrom }, durationSec: { not: null } },
        _avg: { durationSec: true },
      }),
      this.prisma.webSession.groupBy({
        by: ['role'],
        where: { startedAt: { gte: startFrom } },
        _count: { id: true },
        _avg: { durationSec: true },
      }),
      this.prisma.$queryRaw<{ period: string; sessions: number; avg_duration: number }[]>`
        SELECT TO_CHAR(started_at, ${groupFormat}) as period,
               COUNT(*) as sessions,
               AVG(duration_sec) as avg_duration
        FROM web_sessions
        WHERE started_at >= ${startFrom}
        GROUP BY TO_CHAR(started_at, ${groupFormat})
        ORDER BY period DESC
      `,
    ]);

    const [activeSessions, bounceCount] = await Promise.all([
      this.prisma.webSession.count({ where: { endedAt: null } }),
      this.prisma.webSession.count({
        where: { startedAt: { gte: startFrom }, durationSec: { lte: 30 } },
      }),
    ]);

    return {
      period,
      totalSessions,
      activeSessions,
      avgDurationSec: Math.round(avgDuration._avg.durationSec ?? 0),
      bounceRate: totalSessions > 0 ? (bounceCount / totalSessions) * 100 : 0,
      byRole: byRole.map(r => ({
        role: r.role,
        count: r._count.id,
        avgDurationSec: Math.round(r._avg.durationSec ?? 0),
      })),
      timeline: timeline.map(row => ({
        date: row.period,
        sessions: Number(row.sessions),
        avgDurationSec: Math.round(Number(row.avg_duration) || 0),
      })),
    };
  }

  /** Shopkeeper: their own session stats */
  async getMyStats(userId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [thisWeek, thisMonth, avgDuration, totalPageViews] = await Promise.all([
      this.prisma.webSession.count({ where: { userId, startedAt: { gte: weekAgo } } }),
      this.prisma.webSession.count({ where: { userId, startedAt: { gte: monthAgo } } }),
      this.prisma.webSession.aggregate({
        where: { userId, durationSec: { not: null } },
        _avg: { durationSec: true },
      }),
      this.prisma.webSession.aggregate({
        where: { userId },
        _sum: { pageViews: true },
      }),
    ]);

    // Desktop sessions this week
    const desktopThisWeek = await this.prisma.desktopSession.count({
      where: { userId, startedAt: { gte: weekAgo } },
    });

    return {
      thisWeek,
      thisMonth,
      avgSessionMinutes: Math.round((avgDuration._avg.durationSec ?? 0) / 60),
      totalPageViews: totalPageViews._sum.pageViews ?? 0,
      desktopSessionsThisWeek: desktopThisWeek,
    };
  }
}
