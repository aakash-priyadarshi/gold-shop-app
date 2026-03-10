import { Injectable, Logger } from "@nestjs/common";

// Emotion labels that can be detected from transcript + voice
export type EmotionLabel =
  | "excited"
  | "interested"
  | "neutral"
  | "hesitant"
  | "skeptical"
  | "frustrated"
  | "angry"
  | "tired"
  | "confused"
  | "happy"
  | "distracted"
  | "considering"
  | "buying";

export interface EmotionState {
  primary: EmotionLabel;
  secondary?: EmotionLabel;
  intensity: number; // 0-1
  confidence: number; // 0-1
  detectedAt: Date;
  source: "transcript" | "voice_metrics" | "hume_ai";
}

export interface ToneAdaptation {
  stability: number; // 0.2-0.8 for ElevenLabs
  speedMultiplier: number; // 0.75-1.2
  warmth: "clinical" | "neutral" | "warm" | "very_warm";
  energy: "very_low" | "low" | "medium" | "high" | "very_high";
  maxResponseWords: number;
  endWithQuestion: boolean;
  trailingSilenceMs: number;
  openWithValidation: boolean;
  dropSalesContent: boolean;
  backchannelFrequency: "none" | "low" | "normal" | "high";
}

// Frustration signal phrases with weights
const FRUSTRATION_SIGNALS: Record<string, number> = {
  "waste of time": 0.3,
  "not interested": 0.25,
  "stop calling": 0.3,
  "already told you": 0.25,
  "how many times": 0.25,
  "this is ridiculous": 0.3,
  "let me speak": 0.2,
  "listen to me": 0.2,
  "you people": 0.15,
  "whatever": 0.1,
  "I don't care": 0.15,
  "just stop": 0.2,
};

// Buying signal phrases with weights
const BUYING_SIGNALS: Record<string, number> = {
  "how much": 0.2,
  "what's the price": 0.25,
  "pricing": 0.2,
  "next steps": 0.3,
  "get started": 0.3,
  "sign up": 0.3,
  "when can": 0.25,
  "timeline": 0.2,
  "send me": 0.2,
  "email me": 0.15,
  "sounds good": 0.2,
  "I'm interested": 0.25,
  "tell me more": 0.15,
  "how does it work": 0.15,
  "demo": 0.2,
  "trial": 0.2,
  "onboarding": 0.25,
  "contract": 0.2,
  "payment": 0.25,
};

// Hesitation patterns
const HESITATION_PATTERNS = /\b(um+|uh+|hmm+|I'm not sure|I don't know|maybe|I guess|possibly|I'll think)\b/gi;

// Confusion patterns
const CONFUSION_PATTERNS = /\b(wait|what do you mean|I don't understand|can you explain|sorry\??|huh\??|come again)\b/gi;

const EMOTION_ADAPTATIONS: Record<EmotionLabel, ToneAdaptation> = {
  excited: {
    stability: 0.3,
    speedMultiplier: 1.1,
    warmth: "warm",
    energy: "high",
    maxResponseWords: 80,
    endWithQuestion: false,
    trailingSilenceMs: 300,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "high",
  },
  interested: {
    stability: 0.45,
    speedMultiplier: 1.0,
    warmth: "warm",
    energy: "medium",
    maxResponseWords: 100,
    endWithQuestion: true,
    trailingSilenceMs: 500,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "normal",
  },
  neutral: {
    stability: 0.5,
    speedMultiplier: 1.0,
    warmth: "neutral",
    energy: "medium",
    maxResponseWords: 80,
    endWithQuestion: true,
    trailingSilenceMs: 400,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "normal",
  },
  hesitant: {
    stability: 0.55,
    speedMultiplier: 0.9,
    warmth: "very_warm",
    energy: "low",
    maxResponseWords: 60,
    endWithQuestion: true,
    trailingSilenceMs: 800,
    openWithValidation: true,
    dropSalesContent: false,
    backchannelFrequency: "low",
  },
  skeptical: {
    stability: 0.5,
    speedMultiplier: 0.95,
    warmth: "neutral",
    energy: "medium",
    maxResponseWords: 70,
    endWithQuestion: true,
    trailingSilenceMs: 600,
    openWithValidation: true,
    dropSalesContent: false,
    backchannelFrequency: "low",
  },
  frustrated: {
    stability: 0.65,
    speedMultiplier: 0.85,
    warmth: "very_warm",
    energy: "low",
    maxResponseWords: 40,
    endWithQuestion: false,
    trailingSilenceMs: 1000,
    openWithValidation: true,
    dropSalesContent: true,
    backchannelFrequency: "none",
  },
  angry: {
    stability: 0.7,
    speedMultiplier: 0.8,
    warmth: "very_warm",
    energy: "very_low",
    maxResponseWords: 30,
    endWithQuestion: false,
    trailingSilenceMs: 1500,
    openWithValidation: true,
    dropSalesContent: true,
    backchannelFrequency: "none",
  },
  tired: {
    stability: 0.6,
    speedMultiplier: 0.85,
    warmth: "warm",
    energy: "low",
    maxResponseWords: 50,
    endWithQuestion: false,
    trailingSilenceMs: 500,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "low",
  },
  confused: {
    stability: 0.5,
    speedMultiplier: 0.85,
    warmth: "warm",
    energy: "medium",
    maxResponseWords: 60,
    endWithQuestion: true,
    trailingSilenceMs: 600,
    openWithValidation: true,
    dropSalesContent: false,
    backchannelFrequency: "low",
  },
  happy: {
    stability: 0.35,
    speedMultiplier: 1.05,
    warmth: "warm",
    energy: "high",
    maxResponseWords: 90,
    endWithQuestion: true,
    trailingSilenceMs: 300,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "high",
  },
  distracted: {
    stability: 0.55,
    speedMultiplier: 0.9,
    warmth: "neutral",
    energy: "medium",
    maxResponseWords: 40,
    endWithQuestion: true,
    trailingSilenceMs: 500,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "none",
  },
  considering: {
    stability: 0.5,
    speedMultiplier: 0.9,
    warmth: "warm",
    energy: "low",
    maxResponseWords: 50,
    endWithQuestion: false,
    trailingSilenceMs: 2000, // critical: do NOT fill this silence
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "none",
  },
  buying: {
    stability: 0.4,
    speedMultiplier: 1.0,
    warmth: "warm",
    energy: "medium",
    maxResponseWords: 80,
    endWithQuestion: true,
    trailingSilenceMs: 1500,
    openWithValidation: false,
    dropSalesContent: false,
    backchannelFrequency: "normal",
  },
};

@Injectable()
export class EmotionEngineService {
  private readonly logger = new Logger(EmotionEngineService.name);
  private callHistory: Map<string, EmotionState[]> = new Map();

  /**
   * Detect emotion from transcript text (cost-free — no external API).
   * First tier of emotion detection before adding Hume AI voice analysis.
   */
  detectFromTranscript(
    text: string,
    callId: string,
  ): EmotionState {
    const lower = text.toLowerCase();

    // Check frustration signals
    let frustrationScore = 0;
    for (const [phrase, weight] of Object.entries(FRUSTRATION_SIGNALS)) {
      if (lower.includes(phrase)) frustrationScore += weight;
    }
    if (frustrationScore >= 0.5) {
      return this.recordState(callId, {
        primary: frustrationScore >= 0.8 ? "angry" : "frustrated",
        intensity: Math.min(frustrationScore, 1),
        confidence: 0.75,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    // Check buying signals
    let buyingScore = 0;
    for (const [phrase, weight] of Object.entries(BUYING_SIGNALS)) {
      if (lower.includes(phrase)) buyingScore += weight;
    }
    if (buyingScore >= 0.4) {
      return this.recordState(callId, {
        primary: buyingScore >= 0.7 ? "buying" : "interested",
        intensity: Math.min(buyingScore, 1),
        confidence: 0.7,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    // Check hesitation
    const hesitationMatches = text.match(HESITATION_PATTERNS);
    if (hesitationMatches && hesitationMatches.length >= 2) {
      return this.recordState(callId, {
        primary: "hesitant",
        intensity: Math.min(hesitationMatches.length * 0.2, 1),
        confidence: 0.6,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    // Check confusion
    const confusionMatches = text.match(CONFUSION_PATTERNS);
    if (confusionMatches && confusionMatches.length >= 1) {
      return this.recordState(callId, {
        primary: "confused",
        intensity: 0.6,
        confidence: 0.65,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    // Check for long pauses / "hmm" patterns -> considering
    if (/\b(hmm+|hm+)\b/i.test(text) && text.split(" ").length < 10) {
      return this.recordState(callId, {
        primary: "considering",
        intensity: 0.5,
        confidence: 0.5,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    // Check for positive affect
    if (/\b(great|awesome|love|perfect|wonderful|fantastic|yes|yeah|definitely)\b/i.test(lower)) {
      return this.recordState(callId, {
        primary: text.length > 50 ? "excited" : "happy",
        intensity: 0.6,
        confidence: 0.55,
        detectedAt: new Date(),
        source: "transcript",
      });
    }

    return this.recordState(callId, {
      primary: "neutral",
      intensity: 0.3,
      confidence: 0.4,
      detectedAt: new Date(),
      source: "transcript",
    });
  }

  getAdaptation(emotionState: EmotionState): ToneAdaptation {
    return EMOTION_ADAPTATIONS[emotionState.primary] || EMOTION_ADAPTATIONS.neutral;
  }

  getTrend(callId: string, windowSeconds = 60): "improving" | "stable" | "declining" {
    const history = this.callHistory.get(callId) || [];
    if (history.length < 3) return "stable";

    const cutoff = Date.now() - windowSeconds * 1000;
    const recent = history.filter((h) => h.detectedAt.getTime() > cutoff);
    if (recent.length < 2) return "stable";

    const positiveEmotions = new Set(["excited", "interested", "happy", "buying", "considering"]);
    const negativeEmotions = new Set(["frustrated", "angry", "tired", "skeptical"]);

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstPositive = firstHalf.filter((e) => positiveEmotions.has(e.primary)).length;
    const secondPositive = secondHalf.filter((e) => positiveEmotions.has(e.primary)).length;
    const firstNegative = firstHalf.filter((e) => negativeEmotions.has(e.primary)).length;
    const secondNegative = secondHalf.filter((e) => negativeEmotions.has(e.primary)).length;

    if (secondPositive > firstPositive && secondNegative <= firstNegative) return "improving";
    if (secondNegative > firstNegative && secondPositive <= firstPositive) return "declining";
    return "stable";
  }

  needsEscalation(callId: string): boolean {
    const history = this.callHistory.get(callId) || [];
    const recentFive = history.slice(-5);
    const angryCount = recentFive.filter(
      (e) => e.primary === "angry" || (e.primary === "frustrated" && e.intensity > 0.7),
    ).length;
    return angryCount >= 3;
  }

  isReadyToClose(callId: string): boolean {
    const history = this.callHistory.get(callId) || [];
    const recentThree = history.slice(-3);
    const positiveSet = new Set(["excited", "interested", "happy", "buying"]);
    return recentThree.length >= 3 && recentThree.every((e) => positiveSet.has(e.primary));
  }

  getEmotionArc(callId: string): EmotionState[] {
    return this.callHistory.get(callId) || [];
  }

  clearCallHistory(callId: string): void {
    this.callHistory.delete(callId);
  }

  private recordState(callId: string, state: EmotionState): EmotionState {
    if (!this.callHistory.has(callId)) this.callHistory.set(callId, []);
    this.callHistory.get(callId)!.push(state);
    return state;
  }
}
