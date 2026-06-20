import { describe, expect, it } from "vitest";

import type { RepositoryContext } from "./github";
import {
  createHeuristicAnalysis,
  extractJsonObject,
  mergeAnalysisWithHeuristic,
} from "./repo-analysis";

describe("repo analysis helpers", () => {
  it("builds heuristic analysis for mature repositories", () => {
    const analysis = createHeuristicAnalysis(createContext({
      signals: {
        hasReadme: true,
        hasTests: true,
        hasCi: true,
        hasDocker: true,
        hasInfra: true,
        hasAppSource: true,
        sourceFileCount: 12,
      },
    }));

    expect(analysis.estimatedPhase).toBe("배포 준비");
    expect(analysis.estimatedProgress).toBe(80);
    expect(analysis.healthScore).toBeGreaterThanOrEqual(80);
    expect(analysis.inspectedFiles).toEqual(["README.md", "src/app/page.tsx"]);
  });

  it("extracts JSON from fenced model output", () => {
    const json = extractJsonObject('```json\n{"estimatedPhase":"개발 진행 중","estimatedProgress":45}\n```');

    expect(json).toEqual({
      estimatedPhase: "개발 진행 중",
      estimatedProgress: 45,
    });
  });

  it("merges model output onto the heuristic baseline", () => {
    const heuristic = createHeuristicAnalysis(createContext());

    const merged = mergeAnalysisWithHeuristic(heuristic, {
      estimatedPhase: "테스트 & 품질",
      estimatedProgress: 67,
      healthScore: 74,
      suggestions: ["테스트를 보강하세요.", "CI를 붙이세요.", "문서를 정리하세요."],
      inspectedFiles: ["src/app/page.tsx"],
    });

    expect(merged.estimatedPhase).toBe("테스트 & 품질");
    expect(merged.estimatedProgress).toBe(67);
    expect(merged.healthScore).toBe(74);
    expect(merged.inspectedFiles).toEqual(["src/app/page.tsx"]);
  });
});

function createContext(overrides?: Partial<RepositoryContext>): RepositoryContext {
  return {
    summary: {
      fullName: "octocat/hello-world",
      name: "hello-world",
      owner: "octocat",
      private: false,
      description: "Demo repo",
      defaultBranch: "main",
      htmlUrl: "https://github.com/octocat/hello-world",
      updatedAt: "2026-06-20T00:00:00Z",
      pushedAt: "2026-06-20T00:00:00Z",
      stars: 12,
      forks: 3,
      openIssues: 1,
      license: "MIT",
      recentCommitCount: 18,
      languages: [{ name: "TypeScript", bytes: 100, percentage: 100 }],
    },
    tree: {
      entries: [],
      totalCount: 0,
      truncated: false,
    },
    files: [
      { path: "README.md", size: 10, truncated: false, content: "# Demo" },
      { path: "src/app/page.tsx", size: 20, truncated: false, content: "export default function Page() {}" },
    ],
    signals: {
      hasReadme: true,
      hasTests: false,
      hasCi: false,
      hasDocker: false,
      hasInfra: false,
      hasAppSource: true,
      sourceFileCount: 4,
    },
    ...overrides,
  };
}
