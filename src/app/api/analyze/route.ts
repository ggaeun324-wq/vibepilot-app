import { NextRequest, NextResponse } from "next/server";

import { runCopilotPrompt } from "@/lib/copilot";
import {
  buildRepositoryContext,
  collectRepositorySignals,
  GitHubApiError,
  type RepositorySummary,
  type RepositoryTreeEntry,
  sanitizeGitHubToken,
} from "@/lib/github";
import {
  createHeuristicAnalysis,
  extractJsonObject,
  mergeAnalysisWithHeuristic,
  repositoryAnalysisSchema,
} from "@/lib/repo-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_API_BASE = "https://api.github.com";
const PUBLIC_GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "VibePilot",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

interface PublicGitHubRepositoryResponse {
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { name: string } | null;
  owner: {
    login: string;
  };
}

interface PublicGitHubTreeResponse {
  tree: Array<{
    path: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
  }>;
  truncated: boolean;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { repoUrl?: string; githubToken?: string; fullName?: string };
  const token = body.githubToken ? sanitizeGitHubToken(body.githubToken) : "";
  const fullName = body.fullName?.trim();

  if (!fullName && !body.repoUrl) {
    return NextResponse.json({ error: "분석할 레포를 선택해주세요." }, { status: 400 });
  }

  if (fullName && token) {
    try {
      const context = await buildRepositoryContext(token, fullName);
      const heuristic = createHeuristicAnalysis(context);
      const origin = req.nextUrl.origin;
      const prompt = [
        "You are analyzing a GitHub repository for a Korean productivity web app.",
        `Repository: ${fullName}`,
        "Use the available MCP tools to inspect the repository context before answering.",
        "Return JSON only with this shape:",
        '{"estimatedPhase":"string","estimatedProgress":0,"healthScore":0,"suggestions":["..."],"inspectedFiles":["..."]}',
        "Rules:",
        "- estimatedPhase should be one of: 환경 구축, 초기 개발, 개발 진행 중, 테스트 & 품질, 배포 준비",
        "- estimatedProgress and healthScore must be integers between 0 and 100",
        "- suggestions should contain exactly 3 concise Korean recommendations",
        "- inspectedFiles should list the most relevant files you actually used",
      ].join("\n");

      try {
        const result = await runCopilotPrompt({
          prompt,
          repoAccess: {
            githubToken: token,
            mcpUrl: `${origin}/api/mcp/github`,
          },
        });
        const parsed = repositoryAnalysisSchema.parse(extractJsonObject(result));
        return NextResponse.json({
          analysis: mergeAnalysisWithHeuristic(heuristic, parsed),
        });
      } catch {
        return NextResponse.json({
          analysis: heuristic,
        });
      }
    } catch (error) {
      if (error instanceof GitHubApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "레포 분석 중 오류가 발생했어요. 다시 시도해주세요." },
        { status: 500 },
      );
    }
  }

  const repoUrl = body.repoUrl?.trim();
  const match = repoUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json({ error: "유효한 GitHub 레포 URL을 입력해주세요." }, { status: 400 });
  }

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, "");

  try {
    const repoData = await fetchPublicGitHubJson<PublicGitHubRepositoryResponse>(`/repos/${owner}/${repoName}`);
    if (!repoData) {
      return NextResponse.json({
        analysis: generateFallbackAnalysis(repoName),
      });
    }

    const [languagesResult, commitsResult, treeResult] = await Promise.allSettled([
      fetchPublicGitHubJson<Record<string, number>>(`/repos/${owner}/${repoName}/languages`),
      fetchPublicGitHubJson<Array<{ sha: string }>>(`/repos/${owner}/${repoName}/commits?per_page=10`),
      fetchPublicGitHubJson<PublicGitHubTreeResponse>(
        `/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(repoData.default_branch)}?recursive=1`,
      ),
    ]);

    const languages = getSettledValue(languagesResult) ?? {};
    const commits = getSettledValue(commitsResult) ?? [];
    const tree = getSettledValue(treeResult);
    const treeEntries = toRepositoryTreeEntries(tree);

    const summary: RepositorySummary = {
      fullName: repoData.full_name,
      name: repoData.name,
      owner: repoData.owner.login,
      private: repoData.private,
      description: repoData.description,
      defaultBranch: repoData.default_branch,
      htmlUrl: repoData.html_url,
      updatedAt: repoData.updated_at,
      pushedAt: repoData.pushed_at,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      license: repoData.license?.name ?? null,
      recentCommitCount: Array.isArray(commits) ? commits.length : 0,
      languages: buildRepositoryLanguages(languages),
    };

    const heuristic = createHeuristicAnalysis({
      summary,
      tree: {
        entries: treeEntries,
        totalCount: tree?.tree.length ?? 0,
        truncated: tree?.truncated ?? false,
      },
      files: [],
      signals: collectRepositorySignals(treeEntries),
    });

    return NextResponse.json({
      analysis: heuristic,
    });
  } catch {
    return NextResponse.json({
      analysis: generateFallbackAnalysis(repoName),
    });
  }
}

function buildRepositoryLanguages(languages: Record<string, number>) {
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

  return Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    }))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 6);
}

function getSettledValue<T>(result: PromiseSettledResult<T | null>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function toRepositoryTreeEntries(tree: PublicGitHubTreeResponse | null): RepositoryTreeEntry[] {
  if (!tree) {
    return [];
  }

  return tree.tree
    .filter((entry) => entry.path && (entry.type === "blob" || entry.type === "tree"))
    .map((entry) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size,
      sha: entry.sha,
    }));
}

async function fetchPublicGitHubJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: PUBLIC_GITHUB_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

function generateFallbackAnalysis(repoName: string) {
  return {
    repoName,
    description: "비공개 레포이거나 접근할 수 없습니다",
    languages: [],
    stars: 0,
    lastUpdated: null,
    commitActivity: 0,
    estimatedPhase: "분석 불가",
    estimatedProgress: 0,
    suggestions: [
      "레포를 Public으로 설정하면 더 자세한 분석이 가능해요.",
      "GitHub 토큰을 연동하면 Private 레포도 분석할 수 있어요.",
      "직접 진행 단계를 선택해서 관리해보세요.",
    ],
    healthScore: 0,
    inspectedFiles: [],
  };
}
