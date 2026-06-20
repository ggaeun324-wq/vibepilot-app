import { z } from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  buildRepositoryContext,
  getFileContent,
  getRepositorySummary,
  getRepositoryTree,
  listAccessibleRepositories,
  sanitizeGitHubToken,
  validateGitHubToken,
} from "@/lib/github";

export function createGitHubMcpServer(token: string) {
  const sanitizedToken = sanitizeGitHubToken(token);
  const server = new McpServer(
    {
      name: "vibepilot-github-repo",
      version: "1.0.0",
    },
    {
      instructions:
        "Read-only GitHub repository access for VibePilot. Use these tools to inspect accessible repositories, read repository trees, and inspect selected text files. Never attempt to modify repository state.",
    },
  );

  server.registerTool(
    "validate_github_token",
    {
      title: "Validate GitHub token",
      description: "Validates the current GitHub PAT and returns the authenticated user.",
    },
    async () => {
      const user = await validateGitHubToken(sanitizedToken);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "list_repositories",
    {
      title: "List accessible repositories",
      description: "Lists repositories accessible to the current GitHub token. Supports optional search query and result limit.",
      inputSchema: {
        query: z.string().optional().describe("Filter repositories by name or description."),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum number of repositories to return."),
      },
    },
    async ({ query, limit }) => {
      const repositories = await listAccessibleRepositories(sanitizedToken, query, limit ?? 30);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(repositories, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_repository_summary",
    {
      title: "Get repository summary",
      description: "Returns metadata and language breakdown for a repository in owner/repo format.",
      inputSchema: {
        fullName: z.string().describe("Repository full name in owner/repo format."),
      },
    },
    async ({ fullName }) => {
      const summary = await getRepositorySummary(sanitizedToken, fullName);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_repository_tree",
    {
      title: "Get repository tree",
      description: "Returns a recursive repository tree with file and directory paths.",
      inputSchema: {
        fullName: z.string().describe("Repository full name in owner/repo format."),
        ref: z.string().optional().describe("Git ref to inspect. Defaults to the repository default branch."),
        maxEntries: z.number().int().min(20).max(500).optional().describe("Maximum number of tree entries to return."),
      },
    },
    async ({ fullName, ref, maxEntries }) => {
      const tree = await getRepositoryTree(sanitizedToken, fullName, ref, maxEntries);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tree, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_file_content",
    {
      title: "Get file content",
      description: "Reads a text file from a repository. Large files are truncated for safety.",
      inputSchema: {
        fullName: z.string().describe("Repository full name in owner/repo format."),
        path: z.string().describe("Path to the file inside the repository."),
        ref: z.string().optional().describe("Git ref to inspect. Defaults to the repository default branch."),
      },
    },
    async ({ fullName, path, ref }) => {
      const file = await getFileContent(sanitizedToken, fullName, path, ref);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(file, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_repository_context",
    {
      title: "Get repository context",
      description: "Returns repository summary, a trimmed file tree, and representative file snapshots for analysis.",
      inputSchema: {
        fullName: z.string().describe("Repository full name in owner/repo format."),
      },
    },
    async ({ fullName }) => {
      const context = await buildRepositoryContext(sanitizedToken, fullName);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    },
  );

  return server;
}
