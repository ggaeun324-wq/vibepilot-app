-- pgvector 확장 활성화 (Azure: azure.extensions 허용 필요 / 로컬: pgvector 이미지 필요)
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG 지식베이스 테이블
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- 단계(phase)별 필터 조회용 인덱스
CREATE INDEX "knowledge_chunks_phase_idx" ON "knowledge_chunks"("phase");

-- 코사인 거리 기반 의미 유사도 검색용 HNSW 인덱스
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
