import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    if (!this.genAI || availableAgents.length === 0) {
      return { isHandoff: false, agentName: null };
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 50,
          thinkingConfig: { thinkingBudget: 0 },
        },
      } as any);

      const prompt = `Does this message request to speak/talk/connect with a specific person from this list?
Available agents: ${availableAgents.join(", ")}
Message: "${message}"
Reply ONLY with JSON, no markdown: {"isHandoff":true,"agentName":"Name"} or {"isHandoff":false,"agentName":null}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        isHandoff: !!parsed.isHandoff,
        agentName: parsed.agentName || null,
      };
    } catch (err: any) {
      this.logger.warn(`Handoff detection failed: ${err.message}`);
      return { isHandoff: false, agentName: null };
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
