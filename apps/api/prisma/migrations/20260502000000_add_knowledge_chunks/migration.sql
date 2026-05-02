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

-- NOTE: IVFFlat/HNSW vector indexes require <= 2000 dims; gemini-embedding-001
-- produces 3072-dim vectors so we skip the ANN index. Sequential scan is
-- instant for the small knowledge table (~17-100 rows).
