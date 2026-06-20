import type { Phase } from "@/types/project";

export interface VibePilotChatContext {
  message: string;
  currentPhase: string;
  level: "beginner" | "intermediate" | "advanced";
  completedSteps: number;
  totalSteps: number;
  projectName?: string;
  goal?: string;
  phases: Phase[];
  repoUrl?: string;
  repositoryFullName?: string;
  githubToken?: string;
}

export interface NextActionRecommendation {
  phase: string;
  task: string;
  description: string;
  reason: string;
  acceptanceCriteria: string[];
  progress: {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
  };
}

const VALID_LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const MAX_MESSAGE_LENGTH = 2000;

type ParseResult =
  | { ok: true; value: VibePilotChatContext }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalString(value: unknown): string | undefined {
  const text = toStringValue(value);
  return text.length > 0 ? text.slice(0, 300) : undefined;
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function normalizePhases(value: unknown): Phase[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((phase) => {
    if (!isRecord(phase)) return [];
    const id = toStringValue(phase.id);
    const name = toStringValue(phase.name);
    const emoji = toStringValue(phase.emoji);
    const stepsValue = phase.steps;
    if (!id || !name || !Array.isArray(stepsValue)) return [];

    const steps = stepsValue.flatMap((step) => {
      if (!isRecord(step)) return [];
      const stepId = toStringValue(step.id);
      const title = toStringValue(step.title);
      const description = toStringValue(step.description);
      if (!stepId || !title) return [];
      return [{
        id: stepId,
        title: title.slice(0, 160),
        description: description.slice(0, 220),
        completed: step.completed === true,
        guide: toOptionalString(step.guide),
      }];
    });

    return [{ id, name: name.slice(0, 80), emoji, steps }];
  });
}

export function parseChatContext(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, error: "요청 본문이 올바르지 않습니다." };

  const message = toStringValue(input.message).slice(0, MAX_MESSAGE_LENGTH);
  const currentPhase = toStringValue(input.currentPhase).slice(0, 80);
  const level = toStringValue(input.level);
  const completedSteps = toNonNegativeInteger(input.completedSteps);
  const totalSteps = toNonNegativeInteger(input.totalSteps);

  if (!message) return { ok: false, error: "메시지를 입력해주세요." };
  if (!currentPhase) return { ok: false, error: "현재 단계 정보가 필요합니다." };
  if (!VALID_LEVELS.has(level)) return { ok: false, error: "사용자 레벨이 올바르지 않습니다." };
  if (completedSteps === null || totalSteps === null || completedSteps > totalSteps) {
    return { ok: false, error: "진행도 정보가 올바르지 않습니다." };
  }

  return {
    ok: true,
    value: {
      message,
      currentPhase,
      level: level as VibePilotChatContext["level"],
      completedSteps,
      totalSteps,
      projectName: toOptionalString(input.projectName),
      goal: toOptionalString(input.goal),
      phases: normalizePhases(input.phases),
      repoUrl: toOptionalString(input.repoUrl),
      repositoryFullName: toOptionalString(input.repositoryFullName),
      githubToken: toOptionalString(input.githubToken),
    },
  };
}

export function getLevelLabel(level: VibePilotChatContext["level"]): string {
  if (level === "beginner") return "초보자";
  if (level === "intermediate") return "중급자";
  return "고급자";
}

export function getProgressPercentage(context: Pick<VibePilotChatContext, "completedSteps" | "totalSteps">): number {
  return context.totalSteps > 0 ? Math.round((context.completedSteps / context.totalSteps) * 100) : 0;
}

export function getIncompleteSteps(context: Pick<VibePilotChatContext, "phases" | "currentPhase">) {
  const incomplete = context.phases.flatMap((phase, phaseIndex) =>
    phase.steps
      .filter((step) => !step.completed)
      .map((step, stepIndex) => ({
        phaseId: phase.id,
        phaseName: phase.name,
        phaseIndex,
        stepIndex,
        stepId: step.id,
        title: step.title,
        description: step.description,
        guide: step.guide,
      }))
  );

  return incomplete.length > 0
    ? incomplete
    : [{
        phaseId: "current",
        phaseName: context.currentPhase,
        phaseIndex: 0,
        stepIndex: 0,
        stepId: "next",
        title: `${context.currentPhase} 단계 점검`,
        description: "현재 단계의 남은 작업과 완료 기준을 확인합니다.",
        guide: undefined,
      }];
}

export function recommendNextAction(context: VibePilotChatContext): NextActionRecommendation {
  const [nextStep] = getIncompleteSteps(context);
  const percentage = getProgressPercentage(context);

  return {
    phase: nextStep.phaseName,
    task: nextStep.title,
    description: nextStep.description,
    reason: nextStep.guide ?? "현재 로드맵에서 가장 앞에 있는 미완료 작업입니다.",
    acceptanceCriteria: [
      "작업 결과가 한 문장으로 설명된다.",
      "완료 여부를 스스로 확인할 수 있는 산출물이 있다.",
      "다음 단계로 넘어가기 전에 막힌 점이 기록되어 있다.",
    ],
    progress: {
      completedSteps: context.completedSteps,
      totalSteps: context.totalSteps,
      percentage,
    },
  };
}

export function buildProjectSnapshot(context: VibePilotChatContext): string {
  const phaseSummaries = context.phases.map((phase) => {
    const completed = phase.steps.filter((step) => step.completed).length;
    return `- ${phase.name}: ${completed}/${phase.steps.length} 완료`;
  });

  return [
    `프로젝트: ${context.projectName ?? "이름 미정"}`,
    `목표: ${context.goal ?? "목표 미정"}`,
    `사용자 레벨: ${getLevelLabel(context.level)}`,
    `현재 단계: ${context.currentPhase}`,
    `전체 진행도: ${context.completedSteps}/${context.totalSteps} (${getProgressPercentage(context)}%)`,
    context.repositoryFullName
      ? `GitHub 저장소: ${context.repositoryFullName}`
      : context.repoUrl ? `GitHub 저장소: ${context.repoUrl}` : "GitHub 저장소: 미연결",
    "단계 요약:",
    phaseSummaries.length > 0 ? phaseSummaries.join("\n") : "- 단계 상세 정보 없음",
  ].join("\n");
}

export function buildCopilotPrompt(context: VibePilotChatContext): string {
  return [
    "다음 VibePilot 프로젝트 상태를 기준으로 사용자의 질문에 답하세요.",
    "가능하면 recommend_next_action 도구를 사용해 다음 행동과 성공 기준을 구체화하세요.",
    "GitHub MCP 도구가 사용 가능하고 사용자가 이슈, PR, 저장소 상태를 물으면 read-only 도구로 확인하세요.",
    "응답은 한국어로, 짧은 진단 -> 추천 행동 -> 성공 기준 순서로 작성하세요.",
    "",
    buildProjectSnapshot(context),
    "",
    `사용자 질문: ${context.message}`,
  ].join("\n");
}

export function buildSystemMessage(): string {
  return [
    "당신은 VibePilot Coach입니다.",
    "VibePilot은 1인 개발자가 바이브 코딩 프로젝트를 기획부터 배포까지 완주하도록 돕는 개인 생산성 웹앱입니다.",
    "일반론보다 현재 프로젝트 상태에서 바로 실행할 수 있는 다음 행동 하나를 우선합니다.",
    "AI 제안은 자동 확정이 아니라 사용자가 검토할 수 있는 추천으로 표현합니다.",
    "시크릿, 토큰, 비밀번호를 프롬프트에 입력하라고 요구하지 않습니다.",
  ].join("\n");
}

export function buildFallbackResponse(context: VibePilotChatContext): string {
  const nextAction = recommendNextAction(context);
  const phaseAdvice: Record<string, string> = {
    "기획": "아이디어, 대상 사용자, MVP 기능을 한 문장씩 정리하면 다음 단계가 선명해져요.",
    "설계": "화면 목록과 데이터 흐름을 먼저 정리하고, API와 DB는 그 흐름에서 필요한 만큼만 잡아보세요.",
    "환경 구축": "프로젝트 초기화, Git 저장소, 환경변수 분리를 먼저 끝내면 이후 작업이 훨씬 안정적이에요.",
    "프론트엔드": "공통 컴포넌트와 핵심 화면부터 만들고, 상태 흐름은 작게 검증하면서 붙이는 게 좋아요.",
    "백엔드": "가장 중요한 CRUD 흐름 하나를 먼저 만들고 입력 검증과 에러 처리를 바로 붙이세요.",
    "통합": "프론트에서 실제 API를 호출해 보고, 성공/실패/로딩 상태를 한 번에 확인하세요.",
    "테스트": "핵심 계산 로직이나 API 입력 검증처럼 실패 비용이 큰 부분부터 테스트하세요.",
    "배포 준비": "빌드, 환경변수, 모니터링, CI/CD를 체크리스트로 확인하세요.",
    "배포": "스테이징에서 최종 확인 후 프로덕션 배포와 배포 후 모니터링까지 한 흐름으로 보세요.",
    "운영": "사용자 피드백, 버그 이슈, 성능 개선 항목을 작게 나눠 반복적으로 처리하세요.",
  };

  return [
    `현재 ${context.currentPhase} 단계에서는 ${phaseAdvice[context.currentPhase] ?? "가장 앞의 미완료 작업부터 작게 완료하는 것이 좋아요."}`,
    "",
    `추천 행동: ${nextAction.task}`,
    nextAction.description,
    "",
    "성공 기준:",
    ...nextAction.acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}