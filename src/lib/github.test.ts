import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildRepositoryContext,
  getFileContent,
  getRepositorySummary,
  GitHubApiError,
  listAccessibleRepositories,
  sanitizeGitHubToken,
  splitRepositoryFullName,
} from "./github";

describe("github helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("trims tokens and parses owner/repo names", () => {
    expect(sanitizeGitHubToken("  ghp_123  ")).toBe("ghp_123");
    expect(splitRepositoryFullName("octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("throws a typed error for invalid repository names", () => {
    expect(() => splitRepositoryFullName("invalid-name")).toThrow(GitHubApiError);
  });

  it("filters accessible repositories by query and limit", async () => {
    mockFetchSequence([
      createJsonResponse([
        repositoryResponse({
          id: 1,
          full_name: "octocat/hello-world",
          description: "Main app",
          owner: { login: "octocat" },
        }),
        repositoryResponse({
          id: 2,
          full_name: "octocat/docs",
          description: "Documentation",
          owner: { login: "octocat" },
        }),
      ]),
    ]);

    const repositories = await listAccessibleRepositories("token", "hello", 10);

    expect(repositories).toEqual([
      {
        id: 1,
        name: "hello-world",
        fullName: "octocat/hello-world",
        owner: "octocat",
        private: false,
        description: "Main app",
        defaultBranch: "main",
        updatedAt: "2026-06-20T00:00:00Z",
        htmlUrl: "https://github.com/octocat/hello-world",
      },
    ]);
  });

  it("builds repository summaries from repo, languages, and commits", async () => {
    mockFetchSequence([
      createJsonResponse(repositoryResponse()),
      createJsonResponse({ TypeScript: 80, JavaScript: 20 }),
      createJsonResponse([{ sha: "1" }, { sha: "2" }]),
    ]);

    const summary = await getRepositorySummary("token", "octocat/hello-world");

    expect(summary).toMatchObject({
      fullName: "octocat/hello-world",
      recentCommitCount: 2,
      license: "MIT",
    });
    expect(summary.languages).toEqual([
      { name: "TypeScript", bytes: 80, percentage: 80 },
      { name: "JavaScript", bytes: 20, percentage: 20 },
    ]);
  });

  it("reads and truncates base64 file content when needed", async () => {
    const largeText = "a".repeat(12050);
    mockFetchSequence([
      createJsonResponse({
        type: "file",
        path: "README.md",
        name: "README.md",
        size: largeText.length,
        encoding: "base64",
        content: Buffer.from(largeText, "utf8").toString("base64"),
      }),
    ]);

    const file = await getFileContent("token", "octocat/hello-world", "README.md");

    expect(file.path).toBe("README.md");
    expect(file.truncated).toBe(true);
    expect(file.content.endsWith("/* truncated */")).toBe(true);
  });

  it("builds repository context with representative files and signals", async () => {
    const fetchMock = mockFetchSequence([
      createJsonResponse(repositoryResponse()),
      createJsonResponse({ TypeScript: 80, JavaScript: 20 }),
      createJsonResponse([{ sha: "1" }, { sha: "2" }, { sha: "3" }]),
      createJsonResponse({
        truncated: false,
        tree: [
          treeBlob("README.md", 100),
          treeBlob("package.json", 80),
          treeBlob("src/app/page.tsx", 120),
          treeBlob("src/app/page.test.tsx", 95),
          treeBlob(".github/workflows/ci.yml", 40),
          treeBlob("Dockerfile", 20),
          treeBlob("infra/main.bicep", 30),
        ],
      }),
      createFileResponse("README.md", "# Hello"),
      createFileResponse("package.json", '{\"name\":\"demo\"}'),
      createFileResponse("src/app/page.tsx", "export default function Page() {}"),
      createFileResponse("Dockerfile", "FROM node:22-alpine"),
      createFileResponse("infra/main.bicep", "resource demo 'x@y' = {}"),
    ]);

    const context = await buildRepositoryContext("token", "octocat/hello-world");

    expect(context.summary.fullName).toBe("octocat/hello-world");
    expect(context.tree.totalCount).toBe(7);
    expect(context.files.map((file) => file.path)).toEqual([
      "README.md",
      "package.json",
      "src/app/page.tsx",
      "Dockerfile",
      "infra/main.bicep",
    ]);
    expect(context.signals).toMatchObject({
      hasReadme: true,
      hasTests: true,
      hasCi: true,
      hasDocker: true,
      hasInfra: true,
      hasAppSource: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(9);
  });

  it("surfaces github authentication errors with status", async () => {
    mockFetchSequence([
      createJsonResponse({ message: "Bad credentials" }, { status: 401 }),
    ]);

    await expect(listAccessibleRepositories("bad-token")).rejects.toMatchObject({
      name: "GitHubApiError",
      status: 401,
      message: "GitHub 토큰이 유효하지 않거나 만료되었어요.",
    });
  });
});

function mockFetchSequence(responses: Response[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function createFileResponse(path: string, content: string) {
  return createJsonResponse({
    type: "file",
    path,
    name: path.split("/").at(-1),
    size: content.length,
    encoding: "base64",
    content: Buffer.from(content, "utf8").toString("base64"),
  });
}

function repositoryResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    name: "hello-world",
    full_name: "octocat/hello-world",
    private: false,
    html_url: "https://github.com/octocat/hello-world",
    description: "Main app",
    default_branch: "main",
    updated_at: "2026-06-20T00:00:00Z",
    pushed_at: "2026-06-20T00:00:00Z",
    stargazers_count: 10,
    forks_count: 3,
    open_issues_count: 1,
    license: { key: "mit", name: "MIT" },
    owner: { login: "octocat" },
    ...overrides,
  };
}

function treeBlob(path: string, size: number) {
  return {
    path,
    mode: "100644",
    type: "blob" as const,
    sha: `${path}-sha`,
    size,
  };
}
