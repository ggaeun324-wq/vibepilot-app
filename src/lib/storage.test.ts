import { afterEach, describe, expect, it, vi } from "vitest";

import type { Phase } from "@/types/project";

import {
  buildSavedProject,
  calculatePhaseTargets,
  calculateProgress,
  calculateTimeProgress,
} from "./storage";

describe("storage helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates total and completed step progress", () => {
    const phases = [
      createPhase("planning", [true, false]),
      createPhase("build", [true, true]),
    ];

    expect(calculateProgress(phases)).toEqual({
      totalSteps: 4,
      completedSteps: 3,
      percentage: 75,
    });
  });

  it("calculates schedule progress from the project date range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));

    expect(calculateTimeProgress("2026-06-10", "2026-06-20")).toEqual({
      totalDays: 10,
      elapsedDays: 5,
      remainingDays: 5,
      timeProgress: 50,
    });
  });

  it("preserves createdAt while refreshing updatedAt", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");
    const phases = [createPhase("planning", [true, false])];

    const project = buildSavedProject({
      id: "proj_1",
      name: "Demo",
      level: "beginner",
      goal: "Ship MVP",
      startDate: "2026-06-20",
      endDate: "2026-06-27",
      phases,
      createdAt: "2026-06-19T10:00:00.000Z",
    }, now);

    expect(project.createdAt).toBe("2026-06-19T10:00:00.000Z");
    expect(project.updatedAt).toBe(now.toISOString());
    expect(project.phases).not.toBe(phases);
    expect(project.phases[0].steps[0]).not.toBe(phases[0].steps[0]);
  });

  it("clamps same-day timelines without dividing by zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));

    expect(calculateTimeProgress("2026-06-20", "2026-06-20")).toEqual({
      totalDays: 1,
      elapsedDays: 1,
      remainingDays: 0,
      timeProgress: 100,
    });
  });

  it("keeps phase targets upcoming until the first step is completed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T00:00:00.000Z"));

    const result = calculatePhaseTargets(
      [
        createPhase("planning", [false, false]),
        createPhase("build", [false, false]),
      ],
      "2026-06-10",
      "2026-06-20",
    );

    expect(result).toMatchObject({
      expectedCompleted: 0,
      timeProgress: 0,
    });
    expect(result.phaseTargets).toMatchObject([
      {
        phaseId: "planning",
        status: "upcoming",
        completedSteps: 0,
        totalSteps: 2,
        actualProgress: 0,
        expectedProgress: 0,
        isOnTrack: true,
      },
      {
        phaseId: "build",
        status: "upcoming",
        completedSteps: 0,
        totalSteps: 2,
        actualProgress: 0,
        expectedProgress: 0,
        isOnTrack: true,
      },
    ]);
  });

  it("derives phase targets from timeline progress without repeated slice math", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00.000Z"));

    const phases = [
      createPhase("planning", [true, false]),
      createPhase("build", [false, false]),
    ];

    const result = calculatePhaseTargets(phases, "2026-06-18", "2026-06-22");

    expect(result.timeProgress).toBe(50);
    expect(result.expectedCompleted).toBe(2);
    expect(result.phaseTargets).toMatchObject([
      {
        phaseId: "planning",
        status: "current",
        completedSteps: 1,
        totalSteps: 2,
        actualProgress: 50,
        expectedProgress: 100,
        isOnTrack: false,
      },
      {
        phaseId: "build",
        status: "upcoming",
        completedSteps: 0,
        totalSteps: 2,
        actualProgress: 0,
        expectedProgress: 0,
        isOnTrack: true,
      },
    ]);
  });

  it("marks the active phase behind schedule when work lags", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T00:00:00.000Z"));

    const result = calculatePhaseTargets(
      [
        createPhase("planning", [true, true]),
        createPhase("build", [false, false]),
      ],
      "2026-06-10",
      "2026-06-20",
    );

    expect(result).toMatchObject({
      expectedCompleted: 3,
      timeProgress: 80,
    });
    expect(result.phaseTargets).toMatchObject([
      {
        phaseId: "planning",
        status: "completed",
        completedSteps: 2,
        totalSteps: 2,
        actualProgress: 100,
        expectedProgress: 100,
        isOnTrack: true,
      },
      {
        phaseId: "build",
        status: "current",
        completedSteps: 0,
        totalSteps: 2,
        actualProgress: 0,
        expectedProgress: 60,
        isOnTrack: false,
      },
    ]);
  });
});

function createPhase(id: string, completedSteps: boolean[]): Phase {
  return {
    id,
    name: id,
    emoji: "✨",
    steps: completedSteps.map((completed, index) => ({
      id: `${id}-${index + 1}`,
      title: `Step ${index + 1}`,
      description: `Description ${index + 1}`,
      completed,
    })),
  };
}
