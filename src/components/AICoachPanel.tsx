"use client";

import { useMemo, useState } from "react";
import type { Phase } from "@/types/project";
import { streamCopilotChat } from "@/lib/chat-client";
import type { RepositoryOption } from "@/lib/github";

interface AICoachPanelProps {
  currentPhase: string;
  level: string;
  completedSteps: number;
  totalSteps: number;
  projectName: string;
  goal: string;
  phases: Phase[];
  repoUrl?: string;
  repository?: RepositoryOption | null;
  githubToken?: string;
}

const ACTIONS = [
  { id: "next", label: "다음 행동 추천", prompt: "현재 상태에서 바로 실행할 다음 행동 하나와 성공 기준을 추천해줘." },
  { id: "readiness", label: "준비도 점검", prompt: "현재 프로젝트가 다음 마일스톤으로 넘어갈 준비가 됐는지 점검해줘." },
  { id: "github", label: "이슈/PR 확인", prompt: "연결된 GitHub 저장소의 이슈와 PR 기준으로 오늘 우선순위를 잡아줘." },
] as const;

export default function AICoachPanel({
  currentPhase,
  level,
  completedSteps,
  totalSteps,
  projectName,
  goal,
  phases,
  repoUrl,
  repository,
  githubToken,
}: AICoachPanelProps) {
  const [selectedAction, setSelectedAction] = useState<(typeof ACTIONS)[number]["id"] | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nextStep = useMemo(() => {
    return phases
      .flatMap((phase) => phase.steps.map((step) => ({ phase: phase.name, step })))
      .find((item) => !item.step.completed);
  }, [phases]);

  const askCoach = async (action: (typeof ACTIONS)[number]) => {
    if (isLoading) return;
    setSelectedAction(action.id);
    setAnswer("");
    setError("");
    setIsLoading(true);

    try {
      const finalAnswer = await streamCopilotChat(
        {
          message: action.prompt,
          currentPhase,
          level,
          completedSteps,
          totalSteps,
          projectName,
          goal,
          phases,
          repoUrl: repository?.htmlUrl ?? repoUrl,
          repositoryFullName: repository?.fullName,
          githubToken,
        },
        setAnswer
      );

      if (!finalAnswer.trim()) {
        setAnswer("답변을 생성하지 못했어요. 다시 시도해주세요.");
      }
    } catch {
      setError("AI 응답을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">AI 코치</h3>
          <p className="text-xs text-purple-600 mt-1">
            {repository ? `Copilot SDK · ${repository.fullName}` : "Copilot SDK"}
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
          {currentPhase}
        </span>
      </div>

      <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 mb-4">
        <p className="text-sm font-semibold text-gray-800">
          {nextStep ? nextStep.step.title : "모든 단계 완료"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {nextStep ? `${nextStep.phase} · ${nextStep.step.description}` : "운영 개선 항목을 추가해보세요."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => askCoach(action)}
            disabled={isLoading}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              selectedAction === action.id
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
            } disabled:opacity-60`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {(isLoading || answer || error) && (
        <div className="min-h-24 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 whitespace-pre-wrap">
          {error || answer || "AI 응답 생성 중..."}
        </div>
      )}
    </div>
  );
}