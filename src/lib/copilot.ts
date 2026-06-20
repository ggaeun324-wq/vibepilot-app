import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { DefaultAzureCredential, ManagedIdentityCredential, TokenCredential } from "@azure/identity";
import { approveAll, CopilotClient, RuntimeConnection, ToolSet } from "@github/copilot-sdk";

export interface CopilotRepoAccessConfig {
  githubToken: string;
  mcpUrl: string;
}

interface RunCopilotPromptOptions {
  prompt: string;
  repoAccess?: CopilotRepoAccessConfig;
}

export async function runCopilotPrompt(options: RunCopilotPromptOptions): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const modelName = process.env.MODEL_NAME ?? process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !modelName) {
    throw new Error("Azure OpenAI 설정이 부족해요. AZURE_OPENAI_ENDPOINT와 MODEL_NAME(또는 AZURE_OPENAI_DEPLOYMENT)을 확인해주세요.");
  }

  const bearerToken = await getAzureBearerToken();
  const baseDirectory = await mkdtemp(path.join(os.tmpdir(), "vibepilot-copilot-"));
  const cliLoaderPath = path.join(process.cwd(), "node_modules", "@github", "copilot", "npm-loader.js");
  const client = new CopilotClient({
    connection: RuntimeConnection.forStdio({
      path: cliLoaderPath,
    }),
    mode: "empty",
    useLoggedInUser: false,
    workingDirectory: process.cwd(),
    baseDirectory,
    logLevel: "error",
  });

  await client.start();

  try {
    const session = await client.createSession({
      model: modelName,
      provider: {
        type: "azure",
        baseUrl: endpoint,
        bearerToken,
        wireApi: "completions",
        azure: {
          apiVersion: "2025-04-01-preview",
        },
      },
      onPermissionRequest: approveAll,
      mcpServers: options.repoAccess
        ? {
            githubrepo: {
              type: "http",
              url: options.repoAccess.mcpUrl,
              headers: {
                Authorization: `Bearer ${options.repoAccess.githubToken}`,
              },
              tools: ["*"],
              timeout: 30000,
            },
          }
        : undefined,
      availableTools: options.repoAccess ? new ToolSet().addMcp("*") : undefined,
    });

    try {
      const result = await session.sendAndWait(options.prompt, 120000);
      return result?.data.content ?? "";
    } finally {
      await session.disconnect();
    }
  } finally {
    await client.stop();
    await rm(baseDirectory, { recursive: true, force: true });
  }
}

async function getAzureBearerToken(): Promise<string> {
  const credential = getAzureCredential();
  const token = await credential.getToken("https://cognitiveservices.azure.com/.default");

  if (!token?.token) {
    throw new Error("Azure OpenAI bearer token을 가져오지 못했어요.");
  }

  return token.token;
}

function getAzureCredential(): TokenCredential {
  if (process.env.NODE_ENV === "development") {
    return new DefaultAzureCredential();
  }

  return process.env.AZURE_CLIENT_ID
    ? new ManagedIdentityCredential(process.env.AZURE_CLIENT_ID)
    : new ManagedIdentityCredential();
}
