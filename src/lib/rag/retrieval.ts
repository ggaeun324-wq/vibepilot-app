import { prisma } from "@/lib/prisma";
import { embedText, isEmbeddingEnabled, toVectorLiteral } from "./embeddings";

export type KnowledgeHit = {
  title: string;
  source: string;
  phase: string | null;
  content: string;
  similarity: number;
};

type RawRow = {
  title: string;
  source: string;
  phase: string | null;
  content: string;
  distance: number;
};

// 코사인 거리(0=동일)를 유사도(1=동일)로 변환.
function toSimilarity(distance: number): number {
  return Math.round((1 - distance) * 1000) / 1000;
}

// 의미 검색: 질문을 임베딩 → pgvector 코사인 거리로 top-k 청크 반환.
export async function searchKnowledge(query: string, limit = 3): Promise<KnowledgeHit[]> {
  if (!isEmbeddingEnabled() || !query.trim()) return [];

  try {
    const vector = toVectorLiteral(await embedText(query));
    const rows = await prisma.$queryRawUnsafe<RawRow[]>(
      `SELECT title, source, phase, content,
              embedding <=> $1::vector AS distance
       FROM knowledge_chunks
       WHERE embedding IS NOT NULL
       ORDER BY distance ASC
       LIMIT $2`,
      vector,
      limit,
    );
    return rows.map((r) => ({ ...r, similarity: toSimilarity(r.distance) }));
  } catch (error) {
    console.error("knowledge search failed", error);
    return [];
  }
}

// 검색 결과를 프롬프트용 근거 블록으로 포맷 (순수 함수, 테스트 대상).
export function buildEvidenceBlock(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return "";
  const items = hits.map((h, i) => `[근거 ${i + 1}] (${h.title}) ${h.content}`);
  const sources = hits.map((h, i) => `[근거 ${i + 1}] ${h.title} — ${h.source}`);
  return [
    "다음 근거 문서를 참고해 답하고, 인용한 근거의 번호를 본문에 표시하세요.",
    ...items,
    "",
    "출처:",
    ...sources,
  ].join("\n");
}
