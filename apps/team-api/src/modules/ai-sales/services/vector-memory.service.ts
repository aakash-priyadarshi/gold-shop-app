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

  // Configuration for Gemini Embedding 001
  private readonly EMBEDDING_MODEL = "gemini-embedding-001";
  private readonly VECTOR_SIZE = 3072; // Gemini 001 default is 3072

  private readonly MEMORY_COLLECTION = "agent_knowledge_v2";
  private readonly TRANSCRIPTS_COLLECTION = "call_transcripts_v2";

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
      this.logger.error(`Failed to initialize Qdrant: ${err.message}`);
      this.isEnabled = false;
    }
  }

  private async ensureCollection(collectionName: string) {
    const collections = await this.qdrantClient!.getCollections();
    const exists = collections.collections.find((c) => c.name === collectionName);

    if (!exists) {
      this.logger.log(`Creating Qdrant collection: ${collectionName} with ${this.VECTOR_SIZE} dims`);
      await this.qdrantClient!.createCollection(collectionName, {
        vectors: { size: this.VECTOR_SIZE, distance: "Cosine" },
      });
    } else {
      this.logger.log(`Collection ${collectionName} already exists.`);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) throw new Error("Gemini AI not initialized");
    
    // According to Google's official docs, the valid model for generating embeddings is currently `text-embedding-004`
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async upsertKnowledge(id: string, text: string, metadata: Record<string, any> = {}) {
    if (!this.isEnabled) return;
    try {
      const vector = await this.getEmbedding(text);
      await this.qdrantClient!.upsert(this.MEMORY_COLLECTION, {
        wait: true,
        points: [{
          id: this.uuidFromSequence(id),
          vector,
          payload: { text, ...metadata },
        }],
      });
      this.logger.debug(`Upserted knowledge to Qdrant: ${id}`);
    } catch (err: any) {
      this.logger.error(`Upsert failed: ${err.message}`);
    }
  }

  async searchKnowledge(query: string, limit: number = 3): Promise<any[]> {
    if (!this.isEnabled) return [];
    try {
      const vector = await this.getEmbedding(query);
      return await this.qdrantClient!.search(this.MEMORY_COLLECTION, { vector, limit });
    } catch (err: any) {
      this.logger.warn(`Failed to search knowledge: ${err.message}`);
      return [];
    }
  }

  async upsertTranscript(sessionId: string, transcriptSummary: string, metadata: Record<string, any> = {}) {
    if (!this.isEnabled) return;
    try {
      const vector = await this.getEmbedding(transcriptSummary);
      await this.qdrantClient!.upsert(this.TRANSCRIPTS_COLLECTION, {
        wait: true,
        points: [{ id: sessionId, vector, payload: { transcriptSummary, ...metadata } }],
      });
      this.logger.log(`Upserted call transcript memory for session: ${sessionId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to upsert transcript: ${err.message}`);
    }
  }

  async searchTranscripts(query: string, limit: number = 3, filter?: any): Promise<any[]> {
    if (!this.isEnabled) return [];
    try {
      const vector = await this.getEmbedding(query);
      return await this.qdrantClient!.search(this.TRANSCRIPTS_COLLECTION, { vector, limit, filter });
    } catch (err: any) {
      this.logger.warn(`Failed to search transcripts: ${err.message}`);
      return [];
    }
  }

  private uuidFromSequence(seq: string): string {
    let hash = 0;
    for (let i = 0; i < seq.length; i++) {
        hash = (hash << 5) - hash + seq.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(32, "0");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(16, 19)}-${hex.slice(20, 32)}`;
  }
}
