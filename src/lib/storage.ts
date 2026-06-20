import { getGuestProjects, saveGuestProject, deleteGuestProject } from "@/lib/legacy-storage";
import { clonePhases, isSavedProject, SavedProject, toProjectPayload } from "@/lib/project-data";
import { Phase } from "@/types/project";

export type { SavedProject } from "@/lib/project-data";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

interface SavedProjectDraft {
  id: string;
  name: string;
  level: SavedProject["level"];
  goal: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
  createdAt?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function saveProject(project: SavedProject): Promise<void> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toProjectPayload(project)),
  });

  if (response.status === 401) {
    saveGuestProject(project);
    return;
  }

  if (!response.ok) {
    const payload = await readJson(response);
    const error = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "프로젝트를 저장하지 못했습니다.";
    throw new Error(error);
  }
}

export async function getAllProjects(): Promise<SavedProject[]> {
  const response = await fetch("/api/projects", {
    cache: "no-store",
  });

  if (response.status === 401) {
    return getGuestProjects();
  }

  if (!response.ok) {
    const payload = await readJson(response);
    const error = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "프로젝트 목록을 불러오지 못했습니다.";
    throw new Error(error);
  }

  const payload = await readJson(response);
  if (!isRecord(payload) || !Array.isArray(payload.projects)) {
    throw new Error("프로젝트 응답 형식이 올바르지 않습니다.");
  }

  return payload.projects.filter(isSavedProject);
}

export async function getProject(id: string): Promise<SavedProject | null> {
  const projects = await getAllProjects();
  return projects.find((project) => project.id === id) ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (response.status === 401) {
    deleteGuestProject(id);
    return;
  }

  if (!response.ok) {
    const payload = await readJson(response);
    const error = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "프로젝트를 삭제하지 못했습니다.";
    throw new Error(error);
  }
}

export function buildSavedProject(project: SavedProjectDraft, now = new Date()): SavedProject {
  const timestamp = now.toISOString();

  return {
    id: project.id,
    name: project.name,
    level: project.level,
    goal: project.goal ?? "",
    startDate: project.startDate,
    endDate: project.endDate,
    phases: clonePhases(project.phases),
    createdAt: project.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function calculateProgress(phases: Phase[]) {
  const totalSteps = phases.reduce((accumulator, phase) => accumulator + phase.steps.length, 0);
  const completedSteps = phases.reduce(
    (accumulator, phase) => accumulator + phase.steps.filter((step) => step.completed).length,
    0,
  );
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  return { totalSteps, completedSteps, percentage };
}

export function calculateTimeProgress(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { totalDays: 0, elapsedDays: 0, remainingDays: 0, timeProgress: 0 };
  }

  const startTime = start.getTime();
  const normalizedEndTime = Math.max(startTime, end.getTime());
  const totalDuration = normalizedEndTime - startTime;
  const elapsed = now.getTime() - startTime;

  const totalDays = Math.max(1, Math.ceil(totalDuration / DAY_IN_MS));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil(elapsed / DAY_IN_MS)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const timeProgress = totalDuration === 0
    ? now.getTime() >= normalizedEndTime ? 100 : 0
    : Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  return { totalDays, elapsedDays, remainingDays, timeProgress };
}

export function calculatePhaseTargets(
  phases: Phase[],
  startDate: string,
  endDate: string,
  timeline = calculateTimeProgress(startDate, endDate),
) {
  const { totalSteps, completedSteps } = calculateProgress(phases);
  const hasStarted = completedSteps > 0;
  const normalizedTimeProgress = hasStarted ? timeline.timeProgress : 0;
  const expectedCompleted = hasStarted ? Math.round((normalizedTimeProgress / 100) * totalSteps) : 0;
  let cumulativeSteps = 0;

  const phaseTargets = phases.map((phase) => {
    const total = phase.steps.length;
    const completed = phase.steps.filter((step) => step.completed).length;

    if (!hasStarted) {
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        status: "upcoming" as const,
        completedSteps: 0,
        totalSteps: total,
        actualProgress: 0,
        expectedProgress: 0,
        isOnTrack: true,
      };
    }

    const phaseStartRatio = totalSteps > 0 ? cumulativeSteps / totalSteps : 0;
    cumulativeSteps += total;
    const phaseEndRatio = totalSteps > 0 ? cumulativeSteps / totalSteps : phaseStartRatio;
    const phaseStartProgress = Math.round(phaseStartRatio * 100);
    const phaseEndProgress = Math.round(phaseEndRatio * 100);

    let status: "upcoming" | "current" | "completed";
    if (completed === total) {
      status = "completed";
    } else if (normalizedTimeProgress <= phaseStartProgress) {
      status = "upcoming";
    } else {
      status = "current";
    }

    let expectedPhaseProgress = 0;
    if (normalizedTimeProgress >= phaseEndProgress) {
      expectedPhaseProgress = 100;
    } else if (normalizedTimeProgress > phaseStartProgress && phaseEndProgress > phaseStartProgress) {
      expectedPhaseProgress = Math.round(
        ((normalizedTimeProgress - phaseStartProgress) / (phaseEndProgress - phaseStartProgress)) * 100,
      );
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      status,
      completedSteps: completed,
      totalSteps: total,
      actualProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      expectedProgress: expectedPhaseProgress,
      isOnTrack: completed >= Math.floor((expectedPhaseProgress / 100) * total),
    };
  });

  return { expectedCompleted, phaseTargets, timeProgress: normalizedTimeProgress };
}

export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
