import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

/**
 * Thresholds for pgvector cosine similarity search.
 *
 * similarity = 1 - cosine_distance
 *
 * > BYPASS_THRESHOLD  → almost identical to a confirmed false positive,
 *                       skip all scans and allow the message.
 * > HINT_THRESHOLD    → semantically similar — inject as a few-shot hint
 *                       into the Gemini prompt (up to MAX_HINTS examples).
 */
const BYPASS_THRESHOLD = 0.95;
const HINT_THRESHOLD = 0.80;
const MAX_HINTS = 2;

export interface SimilarFalsePositive {
  id: string;
  content: string;
  similarity: number;
}

export interface EmbeddingLookupResult {
  /** Skip scanning entirely — message is semantically identical to known FP */
  bypass: boolean;
  /** 0-2 examples to inject as few-shot context into the AI prompt */
  hints: SimilarFalsePositive[];
}

@Injectable()
export class ModerationEmbeddingService {
  private readonly logger = new Logger(ModerationEmbeddingService.name);
  private readonly apiKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || '';
  }

  /**
   * Generate a 768-dim text embedding using Gemini text-embedding-004.
   * Returns null if the API key is not configured.
   */
  async embed(text: string): Promise<number[] | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${EMBED_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: text.substring(0, 2048) }] },
          taskType: 'SEMANTIC_SIMILARITY',
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Embedding API error: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data?.embedding?.values ?? null;
    } catch (e) {
      this.logger.warn(`Embedding fetch failed: ${e}`);
      return null;
    }
  }

  /**
   * Convert a JS number[] to a Postgres literal that pgvector understands.
   * e.g. [0.1, 0.2, ...] → '[0.1,0.2,...]'
   */
  toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Given a new message, look up the most semantically similar confirmed
   * false-positive messages using pgvector cosine similarity.
   *
   * Returns:
   *  - bypass=true  if similarity > 0.95 (allow message without scanning)
   *  - hints[]      if similarity in (0.80, 0.95) (few-shot context for AI)
   */
  async lookup(content: string): Promise<EmbeddingLookupResult> {
    const empty: EmbeddingLookupResult = { bypass: false, hints: [] };

    const embedding = await this.embed(content);
    if (!embedding) return empty;

    const literal = this.toVectorLiteral(embedding);

    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ id: string; content: string; similarity: number }>
      >(
        `SELECT id, content,
                1 - (embedding <=> $1::vector) AS similarity
         FROM "Message"
         WHERE "isFalsePositive" = true
           AND embedding IS NOT NULL
         ORDER BY similarity DESC
         LIMIT ${MAX_HINTS}`,
        literal,
      );

      if (!rows.length) return empty;

      const top = rows[0];

      if (top.similarity >= BYPASS_THRESHOLD) {
        this.logger.debug(`FP bypass triggered (similarity=${top.similarity.toFixed(3)})`);
        return { bypass: true, hints: [] };
      }

      const hints = rows.filter((r) => r.similarity >= HINT_THRESHOLD);
      return { bypass: false, hints };
    } catch (e) {
      // pgvector not installed or no FP rows yet — degrade gracefully
      this.logger.warn(`pgvector similarity search failed: ${e}`);
      return empty;
    }
  }

  /**
   * Store an embedding for a message that has been confirmed as a false positive.
   * Called from ChatService.unblockMessage() right after marking isFalsePositive=true.
   */
  async storeEmbedding(messageId: string, content: string): Promise<void> {
    const embedding = await this.embed(content);
    if (!embedding) return;

    const literal = this.toVectorLiteral(embedding);

    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Message" SET embedding = $1::vector WHERE id = $2`,
        literal,
        messageId,
      );
      this.logger.debug(`Stored embedding for message ${messageId}`);
    } catch (e) {
      this.logger.warn(`Failed to store embedding for message ${messageId}: ${e}`);
    }
  }
}
