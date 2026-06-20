import { existsSync } from "node:fs";
import path from "node:path";
import { CopilotClient, RuntimeConnection, type PermissionHandler, type ProviderConfig, type SessionConfig } from "@github/copilot-sdk";
import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { buildSystemMessage, type VibePilotChatContext } from "./project-context";
import { createProjectTools } from "./tools";

const READ_ONLY_GITHUB_TOOLS = [
  "get_me",
  "get_file_contents",
  "list_branches",
  "list_commits",
  "list_issues",
  "issue_read",
  "search_issues",
  "list_pull_requests",
  "pull_request_read",
  "actions_list",
];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getGitHubToken(tokenOverride?: string): string | undefined {
  return tokenOverride?.trim() || process.env.GITHUB_MCP_TOKEN || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
}

function getCopilotCliPath(): string | undefined {
  if (process.env.COPILOT_CLI_PATH) return process.env.COPILOT_CLI_PATH;

  const binaryName = process.platform === "win32" ? "copilot.cmd" : "copilot";
  const localCliPath = path.join(process.cwd(), "node_modules", ".bin", binaryName);
  return existsSync(localCliPath) ? localCliPath : undefined;
}

function shouldUseAzureProvider(): boolean {
  return process.env.MODEL_PROVIDER === "azure" || Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.MODEL_NAME);
}

async function createAzureProviderConfig(): Promise<Pick<SessionConfig, "model" | "provider">> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const model = process.env.MODEL_NAME;

  if (!endpoint || !model) {
    throw new Error("Azure Copilot SDK provider requires AZURE_OPENAI_ENDPOINT and MODEL_NAME.");
  }

  const credential = process.env.NODE_ENV === "development"
    ? new DefaultAzureCredential()
    : process.env.AZURE_CLIENT_ID
      ? new ManagedIdentityCredential(process.env.AZURE_CLIENT_ID)
      : new ManagedIdentityCredential();
  const accessToken = await credential.getToken("https://cognitiveservices.azure.com/.default");

  if (!accessToken?.token) {
    throw new Error("Azure credential did not return an access token.");
  }

  const provider: ProviderConfig = {
    type: "azure",
    baseUrl: trimTrailingSlash(endpoint),
    bearerToken: accessToken.token,
    wireApi: "completions",
    azure: {
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-04-01-preview",
    },
  };

  if (process.env.COPILOT_MODEL_ID) {
    provider.modelId = process.env.COPILOT_MODEL_ID;
  }

  return { model, provider };
}

async function createModelConfig(): Promise<Pick<SessionConfig, "model" | "provider">> {
  if (shouldUseAzureProvider()) {
    return createAzureProviderConfig();
  }

  return process.env.COPILOT_MODEL ? { model: process.env.COPILOT_MODEL } : {};
}

function createPermissionHandler(): PermissionHandler {
  return (request) => {
    if (request.kind === "custom-tool") {
      return { kind: "approve-once" };
    }

    if (request.kind === "mcp") {
      return request.readOnly
        ? { kind: "approve-once" }
        : { kind: "reject", feedback: "VibePilot only allows read-only GitHub MCP tools in this flow." };
    }

    if (request.kind === "read" || request.kind === "url") {
      return { kind: "approve-once" };
    }

    return { kind: "reject", feedback: "This VibePilot chat flow does not allow write, shell, memory, or extension operations." };
  };
}

function createMcpServers(tokenOverride?: string): SessionConfig["mcpServers"] | undefined {
  const token = getGitHubToken(tokenOverride);
  if (!token || process.env.GITHUB_MCP_ENABLED === "false") return undefined;

  return {
    github: {
      type: "http",
      url: process.env.GITHUB_MCP_URL || "https://api.githubcopilot.com/mcp/",
      headers: { Authorization: `Bearer ${token}` },
      tools: READ_ONLY_GITHUB_TOOLS,
      timeout: 30000,
    },
  };
}

export function createCopilotClient(tokenOverride?: string): CopilotClient {
  const token = getGitHubToken(tokenOverride);
  const cliPath = getCopilotCliPath();
  const connectionOptions = cliPath
    ? { connection: RuntimeConnection.forStdio({ path: cliPath }) }
    : {};

  return token
    ? new CopilotClient({ ...connectionOptions, gitHubToken: token, useLoggedInUser: false })
    : new CopilotClient(connectionOptions);
}

export async function createVibePilotSessionConfig(context: VibePilotChatContext): Promise<SessionConfig> {
  const modelConfig = await createModelConfig();

  return {
    ...modelConfig,
    streaming: true,
    includeSubAgentStreamingEvents: false,
    systemMessage: { content: buildSystemMessage() },
    tools: createProjectTools(context),
    mcpServers: createMcpServers(context.githubToken),
    onPermissionRequest: createPermissionHandler(),
  };
}