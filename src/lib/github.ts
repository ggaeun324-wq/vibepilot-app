const GITHUB_API_BASE = "https://api.github.com";
const TEXT_FILE_CHAR_LIMIT = 12000;
const TREE_ENTRY_LIMIT = 200;

const PRIORITY_FILE_PATTERNS = [
  "README.md",
  "README",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "next.config.ts",
  "next.config.js",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "azure.yaml",
  "infra/main.bicep",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "app/page.tsx",
  "app/layout.tsx",
  "src/main.ts",
  "src/index.ts",
  "src/App.tsx",
  "requirements.txt",
];

const TEXT_FILE_EXTENSIONS = [
  ".md",
  ".txt",
  ".json",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".rb",
  ".php",
  ".sh",
  ".yml",
  ".yaml",
  ".toml",
  ".env.example",
  ".bicep",
];

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { key: string; name: string } | null;
  owner: {
    login: string;
  };
}

interface GitHubTreeEntryResponse {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntryResponse[];
  truncated: boolean;
}

interface GitHubContentResponse {
  type: "file" | "dir";
  encoding?: string;
  size?: number;
  content?: string;
  path: string;
  name: string;
}

export interface RepositoryOption {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface RepositoryLanguage {
  name: string;
  bytes: number;
  percentage: number;
}

export interface RepositorySummary {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  updatedAt: string;
  pushedAt: string;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  recentCommitCount: number;
  languages: RepositoryLanguage[];
}

export interface RepositoryTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}

export interface RepositoryFileSnapshot {
  path: string;
  size: number;
  truncated: boolean;
  content: string;
}

export interface RepositorySignals {
  hasReadme: boolean;
  hasTests: boolean;
  hasCi: boolean;
  hasDocker: boolean;
  hasInfra: boolean;
  hasAppSource: boolean;
  sourceFileCount: number;
}

export interface RepositoryContext {
  summary: RepositorySummary;
  tree: {
    entries: RepositoryTreeEntry[];
    totalCount: number;
    truncated: boolean;
  };
  files: RepositoryFileSnapshot[];
  signals: RepositorySignals;
}

export interface RepositoryAccessSelection {
  repo: RepositoryOption;
  token: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export function sanitizeGitHubToken(token: string): string {
  return token.trim();
}

export function splitRepositoryFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new GitHubApiError("레포 이름은 owner/repo 형식이어야 해요.", 400);
  }
  return { owner, repo };
}

export async function validateGitHubToken(token: string) {
  return githubRequest<{ login: string; id: number }>(token, "/user");
}

export async function listAccessibleRepositories(
  token: string,
  query?: string,
  limit = 30,
): Promise<RepositoryOption[]> {
  const repositories = await githubRequest<GitHubRepositoryResponse[]>(
    token,
    "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
  );

  const normalizedQuery = query?.trim().toLowerCase();
  const filtered = normalizedQuery
    ? repositories.filter((repository) =>
        repository.full_name.toLowerCase().includes(normalizedQuery) ||
        repository.description?.toLowerCase().includes(normalizedQuery),
      )
    : repositories;

  return filtered.slice(0, limit).map(mapRepositoryOption);
}

export async function getRepositorySummary(
  token: string,
  fullName: string,
): Promise<RepositorySummary> {
  const { owner, repo } = splitRepositoryFullName(fullName);
  const repoData = await githubRequest<GitHubRepositoryResponse>(token, `/repos/${owner}/${repo}`);
  const [languagesData, commits] = await Promise.all([
    githubRequest<Record<string, number>>(token, `/repos/${owner}/${repo}/languages`),
    githubRequest<Array<{ sha: string }>>(token, `/repos/${owner}/${repo}/commits?per_page=20`),
  ]);

  const totalBytes = Object.values(languagesData).reduce((sum, bytes) => sum + bytes, 0);
  const languages = Object.entries(languagesData)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    }))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 6);

  return {
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
    languages,
  };
}

export async function getRepositoryTree(
  token: string,
  fullName: string,
  ref?: string,
  maxEntries = TREE_ENTRY_LIMIT,
): Promise<{ entries: RepositoryTreeEntry[]; totalCount: number; truncated: boolean }> {
  const { owner, repo } = splitRepositoryFullName(fullName);
  const resolvedRef = ref ?? (await getRepositorySummary(token, fullName)).defaultBranch;
  const treeData = await githubRequest<GitHubTreeResponse>(
    token,
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(resolvedRef)}?recursive=1`,
  );

  const entries = treeData.tree
    .filter((entry) => entry.path && entry.type !== undefined)
    .slice(0, maxEntries)
    .map((entry) => ({
      path: entry.path,
      type: entry.type,
      size: entry.size,
      sha: entry.sha,
    }));

  return {
    entries,
    totalCount: treeData.tree.length,
    truncated: treeData.truncated || treeData.tree.length > maxEntries,
  };
}

export async function getFileContent(
  token: string,
  fullName: string,
  filePath: string,
  ref?: string,
): Promise<RepositoryFileSnapshot> {
  const { owner, repo } = splitRepositoryFullName(fullName);
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const content = await githubRequest<GitHubContentResponse>(
    token,
    `/repos/${owner}/${repo}/contents/${encodedPath}${suffix}`,
  );

  if (content.type !== "file" || !content.content || content.encoding !== "base64") {
    throw new GitHubApiError(`파일 ${filePath} 내용을 읽을 수 없어요.`, 422);
  }

  const decoded = Buffer.from(content.content, "base64").toString("utf8");
  const truncated = decoded.length > TEXT_FILE_CHAR_LIMIT;

  return {
    path: content.path,
    size: content.size ?? decoded.length,
    truncated,
    content: truncated ? `${decoded.slice(0, TEXT_FILE_CHAR_LIMIT)}\n/* truncated */` : decoded,
  };
}

export async function buildRepositoryContext(
  token: string,
  fullName: string,
): Promise<RepositoryContext> {
  const summary = await getRepositorySummary(token, fullName);
  const tree = await getRepositoryTree(token, fullName, summary.defaultBranch);
  const selectedFiles = selectRepresentativeFiles(tree.entries);
  const snapshots = await Promise.all(
    selectedFiles.map(async (entry) => {
      try {
        return await getFileContent(token, fullName, entry.path, summary.defaultBranch);
      } catch {
        return null;
      }
    }),
  );

  const files = snapshots.filter((snapshot): snapshot is RepositoryFileSnapshot => snapshot !== null);
  const signals = collectRepositorySignals(tree.entries);

  return {
    summary,
    tree,
    files,
    signals,
  };
}

function mapRepositoryOption(repository: GitHubRepositoryResponse): RepositoryOption {
  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    owner: repository.owner.login,
    private: repository.private,
    description: repository.description,
    defaultBranch: repository.default_branch,
    updatedAt: repository.updated_at,
    htmlUrl: repository.html_url,
  };
}

function selectRepresentativeFiles(entries: RepositoryTreeEntry[]): RepositoryTreeEntry[] {
  const exactMatches: RepositoryTreeEntry[] = [];
  const sourceMatches: RepositoryTreeEntry[] = [];

  for (const pattern of PRIORITY_FILE_PATTERNS) {
    const match = entries.find((entry) => entry.type === "blob" && entry.path === pattern);
    if (match) {
      exactMatches.push(match);
    }
  }

  for (const entry of entries) {
    if (
      entry.type === "blob" &&
      isTextLikeFile(entry.path) &&
      !isTestFile(entry.path) &&
      !exactMatches.some((match) => match.path === entry.path) &&
      (entry.path.startsWith("src/") || entry.path.startsWith("app/") || entry.path.startsWith("pages/"))
    ) {
      sourceMatches.push(entry);
    }
  }

  return [...exactMatches, ...sourceMatches].slice(0, 8);
}

export function collectRepositorySignals(entries: RepositoryTreeEntry[]): RepositorySignals {
  const filePaths = entries.map((entry) => entry.path.toLowerCase());
  const sourceFileCount = entries.filter(
    (entry) =>
      entry.type === "blob" &&
      (entry.path.startsWith("src/") || entry.path.startsWith("app/") || entry.path.startsWith("pages/")) &&
      isTextLikeFile(entry.path),
  ).length;

  return {
    hasReadme: filePaths.some((path) => path === "readme.md" || path === "readme"),
    hasTests: filePaths.some(
      (path) =>
        path.includes("/test") ||
        path.includes("/tests") ||
        path.includes(".test.") ||
        path.includes(".spec."),
    ),
    hasCi: filePaths.some((path) => path.startsWith(".github/workflows/")),
    hasDocker: filePaths.some((path) => path === "dockerfile" || path.startsWith("docker/")),
    hasInfra: filePaths.some(
      (path) =>
        path.startsWith("infra/") ||
        path.endsWith(".bicep") ||
        path.endsWith(".tf") ||
        path === "azure.yaml",
    ),
    hasAppSource: sourceFileCount > 0,
    sourceFileCount,
  };
}

function isTextLikeFile(filePath: string): boolean {
  return TEXT_FILE_EXTENSIONS.some((extension) => filePath.endsWith(extension));
}

function isTestFile(filePath: string): boolean {
  return filePath.includes(".test.") || filePath.includes(".spec.") || filePath.includes("/test/") || filePath.includes("/tests/");
}

async function githubRequest<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${sanitizeGitHubToken(token)}`,
      "User-Agent": "VibePilot",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await safeReadErrorBody(response);
    if (response.status === 401) {
      throw new GitHubApiError("GitHub 토큰이 유효하지 않거나 만료되었어요.", 401, errorBody);
    }
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new GitHubApiError("GitHub API 요청 한도를 초과했어요. 잠시 후 다시 시도해주세요.", 403, errorBody);
      }
      throw new GitHubApiError("이 토큰으로는 해당 레포 또는 데이터에 접근할 수 없어요.", 403, errorBody);
    }
    if (response.status === 404) {
      throw new GitHubApiError("레포 또는 파일을 찾을 수 없어요.", 404, errorBody);
    }

    throw new GitHubApiError("GitHub 요청 중 오류가 발생했어요.", response.status, errorBody);
  }

  return response.json() as Promise<T>;
}

async function safeReadErrorBody(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message;
  } catch {
    return undefined;
  }
}
