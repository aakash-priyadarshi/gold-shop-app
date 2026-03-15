import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

@Injectable()
export class VectorMemoryService implements OnModuleInit {
  private readonly logger = new Logger(VectorMemoryService.name);
  readonly qdrantClient: QdrantClient | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private isEnabled = false;

  private readonly MEMORY_COLLECTION = "agent_knowledge";
  private readonly TRANSCRIPTS_COLLECTION = "call_transcripts";

  constructor(private config: ConfigService) {
    const qdrantUrl = this.config.get<string>("QDRANT_URL");
    const geminiKey = this.config.get<string>("GEMINI_API_KEY");

    if (qdrantUrl && geminiKey) {
      this.qdrantClient = new QdrantClient({ url: qdrantUrl });
      this.genAI = new GoogleGenerativeAI(geminiKey);
      this.isEnabled = true;
    } else {
      this.logger.warn("QDRANT_URL or GEMINI_API_KEY missing. Vector memory is disabled.");
    }
  }

  async onModuleInit() {
    if (!this.isEnabled) return;
    try {
      await this.ensureCollection(this.MEMORY_COLLECTION);
      await this.ensureCollection(this.TRANSCRIPTS_COLLECTION);
    } catch (err: any) {
      this.logger.error(`Failed to initialize Qdrant collections: ${err.message}`);
      this.isEnabled = false;
    }
  }

  private async ensureCollection(collectionName: string) {
    const collections = await this.qdrantClient!.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);
    
    if (!exists) {
      this.logger.log(`Creating Qdrant collection: ${collectionName}`);
      await this.qdrantClient!.createCollection(collectionName, {
        vectors: { size: 768, distance: "Cosine" }, // text-embedding-004 is 768 dims
      });
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) throw new Error("Gemini AI not initialized");
    const model = this.genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Save a generalized piece of knowledge (UI settings, guidelines, etc.)
   */
  async upsertKnowledge(id: string, text: string, metadata: Record<string, any> = {}) {
    if (!this.isEnabled) return;
    try {
      const vector = await this.getEmbedding(text);
      await this.qdrantClient!.upsert(this.MEMORY_COLLECTION, {
        wait: true,
        points: [
          {
            id: this.uuidFromSequence(id),
            vector,
            payload: { text, ...metadata },
          },
        ],
      });
      this.logger.debug(`Upserted knowledge to Qdrant: ${id}`);
    } catch (err: any) {
      this.logger.warn(`Failed to upsert knowledge: ${err.message}`);
    }
  }

  /**
   * Search generalized knowledge base.
   */
  async searchKnowledge(query: string, limit: number = 3): Promise<any[]> {
    if (!this.isEnabled) return [];
    try {
      const vector = await this.getEmbedding(query);
      const results = await this.qdrantClient!.search(this.MEMORY_COLLECTION, {
        vector,
        limit,
      });
      return results;
    } catch (err: any) {
      this.logger.warn(`Failed to search knowledge: ${err.message}`);
      return [];
    }
  }

  /**
   * Save an entire post-call transcript summary for semantic matching in the future.
   */
  async upsertTranscript(sessionId: string, transcriptSummary: string, metadata: Record<string, any> = {}) {
    if (!this.isEnabled) return;
    try {
      const vector = await this.getEmbedding(transcriptSummary);
      await this.qdrantClient!.upsert(this.TRANSCRIPTS_COLLECTION, {
        wait: true,
        points: [
          {
            id: sessionId,
            vector,
            payload: { transcriptSummary, ...metadata },
          },
        ],
      });
      this.logger.log(`Upserted call transcript memory for session: ${sessionId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to upsert transcript: ${err.message}`);
    }
  }

  /**
   * Search past transcripts for objection handling style, persona matching, etc.
   */
  async searchTranscripts(query: string, limit: number = 3, filter?: any): Promise<any[]> {
    if (!this.isEnabled) return [];
    try {
      const vector = await this.getEmbedding(query);
      const results = await this.qdrantClient!.search(this.TRANSCRIPTS_COLLECTION, {
        vector,
        limit,
        filter,
      });
      return results;
    } catch (err: any) {
      this.logger.warn(`Failed to search transcripts: ${err.message}`);
      return [];
    }
  }

  /**
   * Helper to convert an arbitrary string/key into a valid UUID v5 for Qdrant IDs.
   * Qdrant requires UUIDs or unsigned integers.
   */
  private uuidFromSequence(seq: string): string {
    // Generate a pseudo-UUID based on a simple string hash
    let hash = 0;
    for (let i = 0; i < seq.length; i++) {
        hash = (hash << 5) - hash + seq.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(32, "0");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
}
