-- Enable pgvector extension (already declared in schema, idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Support bot RAG knowledge chunks
CREATE TABLE "KnowledgeChunk" (
    "id"        TEXT NOT NULL,
    "topic"     TEXT NOT NULL,
    "content"   TEXT NOT NULL,
    "embedding" vector(3072),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- Index for topic filtering
CREATE INDEX "KnowledgeChunk_topic_idx" ON "KnowledgeChunk"("topic");

-- IVFFlat index for fast cosine similarity search (build after seeding)
-- Lists = sqrt(expected row count). For ~100 chunks: 10 lists is fine.
CREATE INDEX "KnowledgeChunk_embedding_idx"
    ON "KnowledgeChunk" USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 10);
