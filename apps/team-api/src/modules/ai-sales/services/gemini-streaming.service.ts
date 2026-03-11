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

      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite-preview-06-17",
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 300,
          stopSequences: ["\n\n"],
          // thinkingConfig is set via request-level options below
        } as any,
      });

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
