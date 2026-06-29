import { describe, expect, it } from "vitest";
import { toVectorLiteral } from "./embeddings";
import { buildEvidenceBlock, type KnowledgeHit } from "./retrieval";

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
