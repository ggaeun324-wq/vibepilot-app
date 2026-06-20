import type { Phase } from "@/types/project";

export interface CopilotChatRequest {
  message: string;
  currentPhase: string;
  level: string;
  completedSteps: number;
  totalSteps: number;
  projectName: string;
  goal: string;
  phases: Phase[];
  repoUrl?: string;
  repositoryFullName?: string;
  githubToken?: string;
}

export async function streamCopilotChat(
  request: CopilotChatRequest,
  onText: (content: string) => void
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "응답을 불러오지 못했어요.");
  }

  if (!res.body) {
    const text = await res.text();
    onText(text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    content += decoder.decode(value, { stream: true });
    onText(content);
  }

  content += decoder.decode();
  onText(content);
  return content;
}