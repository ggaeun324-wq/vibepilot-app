import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRawUnsafe: vi.fn() } }));
vi.mock("./embeddings", async () => ({
  toVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
  isEmbeddingEnabled: () => true,
  embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

import { prisma } from "@/lib/prisma";
import { toVectorLiteral } from "./embeddings";
import { buildEvidenceBlock, searchKnowledge, type KnowledgeHit } from "./retrieval";

describe("searchKnowledge", () => {
  it("returns empty for blank query", async () => {
    expect(await searchKnowledge("   ")).toEqual([]);
  });
  it("maps rows with similarity", async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { title: "t", source: "s", phase: null, content: "c", distance: 0.2 },
    ]);
    const hits = await searchKnowledge("hello");
    expect(hits[0].similarity).toBe(0.8);
  });
  it("returns empty on error", async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    expect(await searchKnowledge("hello")).toEqual([]);
  });
});

describe("toVectorLiteral", () => {
  it("formats a number array as pgvector literal", () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });
});

describe("buildEvidenceBlock", () => {
  it("returns empty string when no hits", () => {
    expect(buildEvidenceBlock([])).toBe("");
  });

  it("includes evidence and a sources section", () => {
    const hits: KnowledgeHit[] = [
      { title: "CI/CD 기초", source: "knowledge/cicd.md", phase: "배포", content: "파이프라인은 lint, test, build 순서", similarity: 0.9 },
    ];
    const block = buildEvidenceBlock(hits);
    expect(block).toContain("[근거 1] (CI/CD 기초)");
    expect(block).toContain("출처:");
    expect(block).toContain("knowledge/cicd.md");
  });
});
