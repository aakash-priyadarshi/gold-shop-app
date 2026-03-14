import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Daily.co Room Management Service
 *
 * Handles creating/deleting Daily.co rooms and generating meeting tokens for participants.
 * API docs: https://docs.daily.co/reference/rest-api
 */
@Injectable()
export class DailyRoomService {
  private readonly logger = new Logger(DailyRoomService.name);
  private readonly baseUrl = "https://api.daily.co/v1";

  constructor(private prisma: PrismaService) {}

  private async getApiKey(): Promise<string> {
    const settings = (await this.prisma.teamSettings.findUnique({ where: { id: "singleton" } })) as any;
    const key = settings?.dailyApiKey;
    if (!key) throw new Error("Daily.co API key not configured. Add it in Settings.");
    return key;
  }

  private async request(path: string, options: RequestInit = {}) {
    const apiKey = await this.getApiKey();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Daily.co API error (${res.status}): ${body}`);
    }
    return res.json();
  }

  /**
   * Create a Daily.co room for a meeting.
   * Room auto-expires 2 hours after the scheduled time.
   */
  async createRoom(opts: {
    scheduledAt: Date;
    title?: string;
  }): Promise<{ name: string; url: string }> {
    const expiry = Math.floor(opts.scheduledAt.getTime() / 1000) + 2 * 60 * 60; // 2 hours after scheduled time
    const nbf = Math.floor(opts.scheduledAt.getTime() / 1000) - 15 * 60; // 15 minutes before

    const data = await this.request("/rooms", {
      method: "POST",
      body: JSON.stringify({
        privacy: "public",
        properties: {
          exp: expiry,
          nbf,
          max_participants: 10,
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: "cloud",
          eject_at_room_exp: true,
        },
      }),
    });

    this.logger.log(`Created Daily.co room: ${data.name} → ${data.url}`);
    return { name: data.name, url: data.url };
  }

  /**
   * Create a meeting token for a participant (lead).
   * Tokens provide identity and permissions.
   */
  async createMeetingToken(roomName: string, participantName: string): Promise<string> {
    const data = await this.request("/meeting-tokens", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: participantName,
          is_owner: false,
          enable_screenshare: true,
        },
      }),
    });

    return data.token;
  }

  /** Delete a room after the meeting ends (cleanup) */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.request(`/rooms/${roomName}`, { method: "DELETE" });
      this.logger.log(`Deleted Daily.co room: ${roomName}`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete room ${roomName}: ${err.message}`);
    }
  }

  /** Get room details */
  async getRoom(roomName: string): Promise<any> {
    return this.request(`/rooms/${roomName}`);
  }
}
