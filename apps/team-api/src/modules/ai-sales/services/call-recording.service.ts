import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * CallRecordingService — Manage call recordings and coaching annotations.
 *
 * Stores recording metadata (URL, duration, size), supports
 * timestamp-based annotations (golden_moment, mistake, coaching_note),
 * and feeds verified annotations back into Central Brain intelligence.
 */
@Injectable()
export class CallRecordingService {
  private readonly logger = new Logger(CallRecordingService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── RECORDINGS ─── */

  async saveRecording(data: {
    callSessionId: string;
    recordingUrl: string;
    recordingSid?: string;
    duration?: number;
    fileSize?: number;
    format?: string;
  }) {
    return this.prisma.callRecording.upsert({
      where: { callSessionId: data.callSessionId },
      create: data as any,
      update: {
        recordingUrl: data.recordingUrl,
        recordingSid: data.recordingSid,
        duration: data.duration,
        fileSize: data.fileSize,
        format: data.format,
      },
    });
  }

  async listRecordings(limit = 50, offset = 0) {
    const [recordings, total] = await Promise.all([
      this.prisma.callRecording.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          callSession: {
            select: {
              id: true,
              leadId: true,
              status: true,
              duration: true,
              callOutcome: true,
              lead: { select: { name: true, phone: true } },
            },
          },
          _count: { select: { annotations: true } },
        },
      }),
      this.prisma.callRecording.count(),
    ]);

    return { recordings, total };
  }

  async getRecording(callSessionId: string) {
    return this.prisma.callRecording.findUnique({
      where: { callSessionId },
      include: {
        callSession: {
          select: {
            id: true,
            leadId: true,
            status: true,
            duration: true,
            callOutcome: true,
            startedAt: true,
            endedAt: true,
            lead: { select: { name: true, phone: true, segment: true } },
            agent: { select: { name: true } },
          },
        },
        annotations: { orderBy: { timestampSec: "asc" } },
      },
    });
  }

  async getRecordingById(id: string) {
    return this.prisma.callRecording.findUnique({
      where: { id },
      include: {
        callSession: {
          select: {
            id: true,
            leadId: true,
            status: true,
            duration: true,
            callOutcome: true,
            startedAt: true,
            endedAt: true,
            lead: { select: { name: true, phone: true, segment: true } },
            agent: { select: { name: true } },
          },
        },
        annotations: { orderBy: { timestampSec: "asc" } },
      },
    });
  }

  async deleteRecording(id: string) {
    await this.prisma.callAnnotation.deleteMany({ where: { recordingId: id } });
    return this.prisma.callRecording.delete({ where: { id } });
  }

  /* ─── ANNOTATIONS ─── */

  async addAnnotation(data: {
    recordingId: string;
    timestampSec: number;
    endTimestampSec?: number;
    annotationType: string;
    text: string;
    sentiment?: string;
    createdBy?: string;
  }) {
    return this.prisma.callAnnotation.create({ data: data as any });
  }

  async listAnnotations(recordingId: string) {
    return this.prisma.callAnnotation.findMany({
      where: { recordingId },
      orderBy: { timestampSec: "asc" },
    });
  }

  async updateAnnotation(id: string, data: Record<string, any>) {
    return this.prisma.callAnnotation.update({ where: { id }, data });
  }

  async deleteAnnotation(id: string) {
    return this.prisma.callAnnotation.delete({ where: { id } });
  }

  async verifyAnnotation(id: string) {
    return this.prisma.callAnnotation.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * Get annotation stats for coaching dashboard.
   */
  async getAnnotationStats() {
    const [total, byType, verified, recent] = await Promise.all([
      this.prisma.callAnnotation.count(),
      this.prisma.callAnnotation.groupBy({
        by: ["annotationType"],
        _count: true,
      }),
      this.prisma.callAnnotation.count({ where: { isVerified: true } }),
      this.prisma.callAnnotation.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          recording: {
            select: {
              callSession: {
                select: {
                  lead: { select: { name: true } },
                  agent: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      verified,
      byType: byType.map((t) => ({ type: t.annotationType, count: t._count })),
      recent,
    };
  }

  /**
   * Auto-detect golden moments from call transcript for annotation suggestions.
   * (Simple keyword-based detection for MVP, can be upgraded to LLM-based later)
   */
  async suggestAnnotations(callSessionId: string) {
    const recording = await this.prisma.callRecording.findUnique({
      where: { callSessionId },
    });
    if (!recording) return [];

    // Pull conversation moments from Central Brain data
    const moments = await this.prisma.conversationMoment.findMany({
      where: { callSessionId },
      orderBy: { momentIndex: "asc" },
    });

    const suggestions: any[] = [];

    for (const m of moments) {
      if ((m as any).sentiment === "positive" && (m as any).impact === "high") {
        suggestions.push({
          recordingId: recording.id,
          timestampSec: (m as any).momentIndex * 10, // approx
          annotationType: "golden_moment",
          text: `High-impact positive moment: "${(m as any).customerStatement?.substring(0, 80)}"`,
          sentiment: "positive",
        });
      }
      if ((m as any).isObjection) {
        suggestions.push({
          recordingId: recording.id,
          timestampSec: (m as any).momentIndex * 10,
          annotationType: "objection_handled",
          text: `Objection: "${(m as any).customerStatement?.substring(0, 80)}"`,
          sentiment: "neutral",
        });
      }
    }

    return suggestions;
  }

  /**
   * Get recording stats.
   */
  async getStats() {
    const [totalRecordings, totalAnnotations, totalDuration] = await Promise.all([
      this.prisma.callRecording.count(),
      this.prisma.callAnnotation.count(),
      this.prisma.callRecording.aggregate({ _sum: { duration: true } }),
    ]);

    return {
      totalRecordings,
      totalAnnotations,
      totalDurationMinutes: Math.round((totalDuration._sum.duration || 0) / 60),
    };
  }
}
