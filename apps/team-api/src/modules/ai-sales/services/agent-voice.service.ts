import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

interface VoiceRecord {
  id: string;
  name: string;
  voiceId: string;
  languages: string[];
  gender: string | null;
  accent: string | null;
  isDefault: boolean;
  isActive: boolean;
}

@Injectable()
export class AgentVoiceService implements OnModuleInit {
  private readonly logger = new Logger(AgentVoiceService.name);
  private voices: VoiceRecord[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.refresh();
    } catch (err: any) {
      this.logger.warn(`Initial voice load failed (table may not exist yet): ${err.message}`);
    }
    this.refreshTimer = setInterval(() => this.refresh(), 60_000);
  }

  /** Reload voices from DB into memory cache */
  async refresh() {
    try {
      this.voices = await this.prisma.agentVoice.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      this.logger.log(`Loaded ${this.voices.length} active voice(s)`);
    } catch (err: any) {
      this.logger.error(`Failed to load voices: ${err.message}`);
    }
  }

  /** Get the best voice for a detected language code (e.g. "hi-IN", "en-IN") */
  getVoiceForLanguage(langCode?: string): VoiceRecord | null {
    if (!langCode) return this.getDefaultVoice();

    // Exact match first (e.g. "hi-IN")
    const exact = this.voices.find((v) => v.languages.includes(langCode));
    if (exact) return exact;

    // Base language match (e.g. "hi" matches "hi-IN")
    const baseLang = langCode.split("-")[0];
    const partial = this.voices.find((v) =>
      v.languages.some((l) => l.startsWith(baseLang)),
    );
    if (partial) return partial;

    return this.getDefaultVoice();
  }

  /** Find a voice by customer request ("I want to talk to Priya") */
  getVoiceByName(name: string): VoiceRecord | null {
    const lower = name.toLowerCase().trim();
    return this.voices.find((v) => v.name.toLowerCase() === lower) || null;
  }

  /** Get the default voice (isDefault=true, or first active voice) */
  getDefaultVoice(): VoiceRecord | null {
    return this.voices.find((v) => v.isDefault) || this.voices[0] || null;
  }

  /** Get all active voices (for system prompt injection) */
  getAllVoices(): VoiceRecord[] {
    return this.voices;
  }

  /* ─── CRUD ─── */

  async list() {
    return this.prisma.agentVoice.findMany({ orderBy: { createdAt: "asc" } });
  }

  async create(data: {
    name: string;
    voiceId: string;
    languages: string[];
    gender?: string;
    accent?: string;
    isDefault?: boolean;
  }) {
    // If setting as default, unset current default
    if (data.isDefault) {
      await this.prisma.agentVoice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const voice = await this.prisma.agentVoice.create({ data });
    await this.refresh();
    return voice;
  }

  async update(id: string, data: Partial<{
    name: string;
    voiceId: string;
    languages: string[];
    gender: string;
    accent: string;
    isDefault: boolean;
    isActive: boolean;
  }>) {
    if (data.isDefault) {
      await this.prisma.agentVoice.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const voice = await this.prisma.agentVoice.update({ where: { id }, data });
    await this.refresh();
    return voice;
  }

  async remove(id: string) {
    await this.prisma.agentVoice.delete({ where: { id } });
    await this.refresh();
    return { deleted: true };
  }

  /** Seed default voices for first-time setup */
  async seedDefaults() {
    const count = await this.prisma.agentVoice.count();
    if (count > 0) return { seeded: false, message: "Voices already exist" };

    const defaults: Array<{
      name: string;
      voiceId: string;
      languages: string[];
      gender: string;
      accent: string;
      isDefault: boolean;
    }> = [
      {
        name: "Aria",
        voiceId: "9BWtsMINqrJLrRacOk9x",
        languages: ["en-IN", "en-US", "en-GB"],
        gender: "female",
        accent: "Neutral",
        isDefault: true,
      },
      {
        name: "Priya",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        languages: ["hi-IN", "bn-IN", "mr-IN"],
        gender: "female",
        accent: "Indian",
        isDefault: false,
      },
      {
        name: "Raj",
        voiceId: "pNInz6obpgDQGcFmaJgB",
        languages: ["hi-IN", "ta-IN", "te-IN", "kn-IN"],
        gender: "male",
        accent: "Indian",
        isDefault: false,
      },
    ];

    await this.prisma.agentVoice.createMany({ data: defaults });
    await this.refresh();
    return { seeded: true, count: defaults.length };
  }
}
