import type { Prisma } from "@prisma/client";
import { Phase, Step, UserLevel } from "@/types/project";

export interface SavedProject {
  id: string;
  name: string;
  level: UserLevel;
  goal: string;
  startDate: string;
  endDate: string;
  phases: Phase[];
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUserLevel(value: unknown): value is UserLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function isStep(value: unknown): value is Step {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.description === "string"
    && typeof value.completed === "boolean"
    && (value.guide === undefined || typeof value.guide === "string");
}

function isPhase(value: unknown): value is Phase {
  if (!isRecord(value) || !Array.isArray(value.steps)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.emoji === "string"
    && value.steps.every(isStep);
}

export function isSavedProject(value: unknown): value is SavedProject {
  if (!isRecord(value) || !Array.isArray(value.phases)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.name === "string"
    && isUserLevel(value.level)
    && typeof value.goal === "string"
    && typeof value.startDate === "string"
    && typeof value.endDate === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && value.phases.every(isPhase);
}

export function clonePhases(phases: Phase[]): Phase[] {
  return phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    emoji: phase.emoji,
    steps: phase.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      completed: step.completed,
      guide: step.guide,
    })),
  }));
}

export function toProjectPayload(project: SavedProject): SavedProject {
  return {
    ...project,
    goal: project.goal ?? "",
    phases: clonePhases(project.phases),
  };
}

export function toPrismaPhases(phases: Phase[]): Prisma.InputJsonValue {
  return clonePhases(phases) as unknown as Prisma.InputJsonValue;
}

export function fromDatabaseProject(record: {
  clientId: string;
  name: string;
  level: string;
  goal: string;
  startDate: string;
  endDate: string;
  phases: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SavedProject {
  if (!isUserLevel(record.level)) {
    throw new Error(`Unsupported project level: ${record.level}`);
  }

  if (!Array.isArray(record.phases) || !record.phases.every(isPhase)) {
    throw new Error("Stored project phases are invalid.");
  }

  return {
    id: record.clientId,
    name: record.name,
    level: record.level,
    goal: record.goal,
    startDate: record.startDate,
    endDate: record.endDate,
    phases: clonePhases(record.phases),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
