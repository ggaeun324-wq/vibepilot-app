import { z } from "zod";

import { RepositoryContext } from "@/lib/github";

export const repositoryAnalysisSchema = z.object({
  estimatedPhase: z.string().min(1),
  estimatedProgress: z.number().int().min(0).max(100),
  healthScore: z.number().int().min(0).max(100),
  suggestions: z.array(z.string().min(1)).min(1).max(5),
  inspectedFiles: z.array(z.string().min(1)).max(8).optional(),
});

export type RepositoryAnalysisModelOutput = z.infer<typeof repositoryAnalysisSchema>;

export interface RepositoryAnalysis {
  repoName: string;
  description: string;
  languages: { name: string; percentage: number }[];
  stars: number;
  lastUpdated: string | null;
  commitActivity: number;
  estimatedPhase: string;
  estimatedProgress: number;
  suggestions: string[];
  healthScore: number;
  inspectedFiles: string[];
}

export function createHeuristicAnalysis(context: RepositoryContext): RepositoryAnalysis {
  const { summary, signals, files } = context;

  let estimatedPhase = "초기 개발";
  let estimatedProgress = 25;

  if (!signals.hasAppSource) {
    estimatedPhase = "환경 구축";
    estimatedProgress = 10;
  } else if (signals.hasTests && signals.hasCi && signals.hasInfra) {
    estimatedPhase = "배포 준비";
    estimatedProgress = 80;
  } else if (signals.hasTests) {
    estimatedPhase = "테스트 & 품질";
    estimatedProgress = 65;
  } else if (signals.sourceFileCount >= 8) {
    estimatedPhase = "개발 진행 중";
    estimatedProgress = 45;
  }

  const suggestions = buildSuggestions(context);
  const healthScore = calculateHealthScore(context, estimatedProgress);

  return {
    repoName: summary.fullName,
    description: summary.description ?? "설명 없음",
    languages: summary.languages.map((language) => ({
      name: language.name,
      percentage: language.percentage,
    })),
    stars: summary.stars,
    lastUpdated: summary.updatedAt,
    commitActivity: summary.recentCommitCount,
    estimatedPhase,
    estimatedProgress,
    suggestions,
    healthScore,
    inspectedFiles: files.map((file) => file.path),
  };
}

export function mergeAnalysisWithHeuristic(
  heuristic: RepositoryAnalysis,
  modelOutput: RepositoryAnalysisModelOutput,
): RepositoryAnalysis {
  return {
    ...heuristic,
    estimatedPhase: modelOutput.estimatedPhase,
    estimatedProgress: modelOutput.estimatedProgress,
    healthScore: modelOutput.healthScore,
    suggestions: modelOutput.suggestions,
    inspectedFiles: modelOutput.inspectedFiles?.length ? modelOutput.inspectedFiles : heuristic.inspectedFiles,
  };
}

export function extractJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? text;
  const startIndex = candidate.indexOf("{");
  const endIndex = candidate.lastIndexOf("}");

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error("JSON 응답을 찾지 못했어요.");
  }

  return JSON.parse(candidate.slice(startIndex, endIndex + 1));
}

function buildSuggestions(context: RepositoryContext): string[] {
  const { signals } = context;
  const suggestions: string[] = [];

  if (!signals.hasTests) {
    suggestions.push("핵심 흐름부터 테스트를 추가하면 이후 리팩터링이 훨씬 안전해져요.");
  }
  if (!signals.hasCi) {
    suggestions.push("GitHub Actions 같은 CI를 붙여 lint/build를 자동화해보세요.");
  }
  if (!signals.hasInfra) {
    suggestions.push("배포용 인프라나 환경 설정 파일을 정리하면 운영 전환이 쉬워져요.");
  }
  if (!signals.hasReadme) {
    suggestions.push("README에 실행 방법과 프로젝트 구조를 정리해두면 협업성이 좋아져요.");
  }
  if (!signals.hasDocker) {
    suggestions.push("컨테이너 실행 구성을 준비해두면 Azure 배포 흐름이 단순해져요.");
  }

  if (suggestions.length === 0) {
    suggestions.push("현재 구조가 꽤 잘 갖춰져 있어요. 테스트 범위와 운영 모니터링을 더 보강해보세요.");
  }

  return suggestions.slice(0, 3);
}

function calculateHealthScore(context: RepositoryContext, estimatedProgress: number): number {
  const { summary, signals } = context;

  let score = 15;

  if (summary.description) score += 10;
  if (summary.license) score += 10;
  if (signals.hasReadme) score += 10;
  if (signals.hasTests) score += 15;
  if (signals.hasCi) score += 15;
  if (signals.hasInfra) score += 10;
  if (signals.hasDocker) score += 5;
  if (signals.hasAppSource) score += 5;
  if (summary.recentCommitCount >= 5) score += 5;
  if (summary.recentCommitCount >= 15) score += 5;
  score += Math.round(estimatedProgress / 10);

  return Math.max(0, Math.min(100, score));
}
