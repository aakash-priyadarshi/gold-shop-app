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
  personalityDescription: string | null;
  speciality: string | null;
  backstory: string | null;
  age: string | null;
  signaturePhrases: string[];
  bannedPhrases: string[];
  handoffIntro: string | null;
  handoffOutro: string | null;
  systemPromptTemplate: string | null;
  voiceStability: number | null;
  voiceSimilarityBoost: number | null;
  voiceStyle: number | null;
  voiceUseSpeakerBoost: boolean | null;
  emotionVoiceSettings: any;
  targetSegments: string[];
  languageAffinities: any;
  totalCalls: number;
  totalConversions: number;
  avgSatisfactionScore: number | null;
  avgCallDurationSecs: number | null;
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
    this.refreshTimer = setInterval(() => this.refresh(), 300_000);
  }

  /** Reload voices from DB into memory cache */
  async refresh() {
    try {
      this.voices = await this.prisma.agentVoice.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      }) as any[];
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

  async create(data: Record<string, any>) {
    // If setting as default, unset current default
    if (data.isDefault) {
      await this.prisma.agentVoice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const voice = await this.prisma.agentVoice.create({ data: data as any });
    await this.refresh();
    return voice;
  }

  async update(id: string, data: Record<string, any>) {
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

  /** Seed default voice personas for first-time setup */
  async seedDefaults() {
    const count = await this.prisma.agentVoice.count();
    if (count > 0) return { seeded: false, message: "Voices already exist" };

    const defaults = [
      {
        name: "Aria",
        voiceId: "9BWtsMINqrJLrRacOk9x",
        languages: ["en-IN", "en-US", "en-GB"],
        gender: "female",
        accent: "Neutral",
        isDefault: true,
        personalityDescription: "Warm, empathetic, and relationship-first. Aria builds rapport naturally and makes customers feel heard before any pitch. She excels at understanding emotional cues and adapting her tone. Think of her as the colleague everyone trusts.",
        speciality: "rapport",
        backstory: "Aria has been in customer-facing roles for 6 years. She started in hospitality before moving into sales. She genuinely cares about helping people find the right solution, not just closing deals.",
        age: "28",
        signaturePhrases: ["I completely understand", "That makes perfect sense", "Let me make sure I've got this right"],
        bannedPhrases: ["To be honest", "Actually", "No problem"],
        handoffIntro: "Hi! I've just been brought up to speed on your conversation. I'd love to continue from where we left off.",
        handoffOutro: "Let me bring in my colleague who specialises in this area — they'll take great care of you.",
        voiceStability: 0.5,
        voiceSimilarityBoost: 0.75,
        targetSegments: ["region:global", "size:startup", "size:small"],
        languageAffinities: { "en-IN": 5, "en-US": 5, "en-GB": 4 },
      },
      {
        name: "Priya",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        languages: ["hi-IN", "bn-IN", "mr-IN", "en-IN"],
        gender: "female",
        accent: "Indian",
        isDefault: false,
        personalityDescription: "Culturally fluent and warm. Priya switches effortlessly between Hindi and English. She understands Indian business etiquette deeply — the importance of family questions, festival awareness, and respectful persistence. She builds trust through cultural connection.",
        speciality: "rapport",
        backstory: "Priya grew up in Mumbai and has worked across Delhi, Bangalore, and Pune. She understands regional nuances — the Marathi directness, the Bengali warmth, the Tamil formality. She adjusts instinctively.",
        age: "30",
        signaturePhrases: ["Bilkul, samajh gayi", "Aapki baat sahi hai", "Ji haan, zaroor"],
        bannedPhrases: ["Basically", "Like I said", "Obviously"],
        handoffIntro: "Namaste! Main Priya bol rahi hoon. Mujhe puri baat bata di gayi hai, aage badhte hain.",
        handoffOutro: "Main apne colleague ko connect karti hoon jo is area mein expert hain.",
        voiceStability: 0.5,
        voiceSimilarityBoost: 0.75,
        targetSegments: ["region:india", "language:hindi", "language:bengali"],
        languageAffinities: { "hi-IN": 5, "bn-IN": 4, "mr-IN": 4, "en-IN": 4 },
      },
      {
        name: "Raj",
        voiceId: "pNInz6obpgDQGcFmaJgB",
        languages: ["hi-IN", "ta-IN", "te-IN", "kn-IN", "en-IN"],
        gender: "male",
        accent: "Indian",
        isDefault: false,
        personalityDescription: "Confident, data-driven, and technically sharp. Raj is the go-to for enterprise prospects who want specifics — numbers, integrations, compliance. He speaks with authority but never condescends. He earns trust through competence.",
        speciality: "technical",
        backstory: "Raj has an engineering background from IIT Delhi and spent 4 years in product management before moving to sales. He speaks the language of CTOs and technical founders fluently.",
        age: "33",
        signaturePhrases: ["Let me walk you through the numbers", "Here's what the data shows", "Great question — let me be specific"],
        bannedPhrases: ["Trust me", "It's simple", "Don't worry about that"],
        handoffIntro: "Hi, this is Raj. I've been briefed on your conversation and I'd like to dive into the technical details with you.",
        handoffOutro: "I'll connect you with my colleague who can help with the next steps on this.",
        voiceStability: 0.6,
        voiceSimilarityBoost: 0.8,
        targetSegments: ["region:india", "segment:enterprise", "segment:technical"],
        languageAffinities: { "hi-IN": 5, "ta-IN": 4, "te-IN": 4, "kn-IN": 3, "en-IN": 5 },
      },
    ];

    await this.prisma.agentVoice.createMany({ data: defaults });
    await this.refresh();
    return { seeded: true, count: defaults.length };
  }
}
