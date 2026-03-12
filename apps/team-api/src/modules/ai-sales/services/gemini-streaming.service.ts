import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

@Injectable()
export class GeminiStreamingClient {
  private readonly logger = new Logger(GeminiStreamingClient.name);
  private genAI: GoogleGenerativeAI | null = null;
  private conversationHistory: GeminiMessage[] = [];

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("GEMINI_API_KEY");
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /** Inject pre-call brief into conversation history as priming context */
  primeWithBrief(brief: string) {
    this.conversationHistory = [
      { role: "user", parts: [{ text: `[SYSTEM BRIEF]\n${brief}\n\nAcknowledge silently and await the customer.` }] },
      { role: "model", parts: [{ text: "Understood. Ready." }] },
    ];
  }

  resetHistory() {
    this.conversationHistory = [];
  }

  /**
   * Lightweight LLM call to detect if a message requests to speak with a specific agent.
   * Uses gemini-2.5-flash-lite with thinkingBudget=0 for minimal cost/latency (~100-300ms).
   */
  async detectHandoff(
    message: string,
    availableAgents: string[],
  ): Promise<{ isHandoff: boolean; agentName: string | null }> {
    const intents = await this.detectIntents(message, availableAgents);
    return { isHandoff: intents.isHandoff, agentName: intents.agentName };
  }

  /**
   * Combined intent detection — detects BOTH handoff requests AND language-switch
   * in a single LLM call. Supports any language, phrasing, or accent.
   * Cost: ~50-100 tokens per call, gemini-2.5-flash-lite with thinkingBudget=0.
   */
  async detectIntents(
    message: string,
    availableAgents: string[],
  ): Promise<{
    isHandoff: boolean;
    agentName: string | null;
    isLanguageSwitch: boolean;
    language: string | null;
  }> {
    const noResult = { isHandoff: false, agentName: null, isLanguageSwitch: false, language: null };
    if (!this.genAI) return noResult;

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 80,
          thinkingConfig: { thinkingBudget: 0 },
        },
      } as any);

      const agentList = availableAgents.length > 0
        ? `Available agents: ${availableAgents.join(", ")}`
        : "No agents available";

      const prompt = `Analyze this customer message for two intents:
1. HANDOFF: Does the customer want to speak/talk/connect with a specific person?
2. LANGUAGE: Does the customer want to switch the conversation language?

${agentList}
Message: "${message}"

Reply ONLY with JSON, no markdown:
{"isHandoff":false,"agentName":null,"isLanguageSwitch":false,"language":null}

For language, use ISO 639-1 codes: "hi" for Hindi, "en" for English, "ta" for Tamil, "te" for Telugu, "ne" for Nepali, "bn" for Bengali, "mr" for Marathi, "gu" for Gujarati, "pa" for Punjabi, "kn" for Kannada, "ml" for Malayalam, "ur" for Urdu, "as" for Assamese, "ar" for Arabic.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        isHandoff: !!parsed.isHandoff,
        agentName: parsed.agentName || null,
        isLanguageSwitch: !!parsed.isLanguageSwitch,
        language: parsed.language || null,
      };
    } catch (err: any) {
      this.logger.warn(`Intent detection failed: ${err.message}`);
      return noResult;
    }
  }

  async *streamResponse(
    transcript: string,
    systemPrompt: string,
    thinkingBudget: number = 0,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.genAI) {
      this.logger.warn("GEMINI_API_KEY not set — returning fallback");
      yield "I appreciate your time. Could you tell me more about what you're looking for?";
      return;
    }

    try {
      // Add user utterance to history
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: transcript }],
      });

      const generationConfig: Record<string, unknown> = {
        temperature: 0.85,
        maxOutputTokens: 300,
        stopSequences: ["\n\n"],
      };

      // Dynamic thinking budget: 0 = off (fast chit-chat), >0 = on (complex reasoning/objections)
      if (thinkingBudget > 0) {
        generationConfig.thinkingConfig = { thinkingBudget };
      } else {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: systemPrompt,
        generationConfig,
      } as any);

      const chat = model.startChat({
        history: this.conversationHistory.slice(0, -1), // all except last (we send it via sendMessageStream)
      });

      const result = await chat.sendMessageStream(transcript);

      let fullResponse = "";
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullResponse += text;
          yield text;
        }
      }

      // Add assistant response to history
      if (fullResponse) {
        this.conversationHistory.push({
          role: "model",
          parts: [{ text: fullResponse }],
        });
      }
    } catch (err: any) {
      this.logger.error(`Gemini streaming failed: ${err.message}`);
      yield "Sorry, I lost my train of thought — could you repeat that?";
    }
  }
}
