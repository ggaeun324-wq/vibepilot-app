import { describe, expect, it } from "vitest";

import { createProjectImportPlan } from "./project-merge";
import { SavedProject } from "./project-data";

const baseProject: SavedProject = {
  id: "project-1",
  name: "VibePilot",
  level: "beginner",
  goal: "ship",
  startDate: "2026-06-20",
  endDate: "2026-06-21",
  phases: [],
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
};

describe("createProjectImportPlan", () => {
  it("creates missing projects", () => {
    const plan = createProjectImportPlan([], [baseProject]);
    expect(plan.created).toBe(1);
    expect(plan.updated).toBe(0);
    expect(plan.skipped).toBe(0);
    expect(plan.toUpsert).toEqual([baseProject]);
  });

  it("updates when incoming data is newer", () => {
    const existing = [{ ...baseProject, updatedAt: "2026-06-20T01:00:00.000Z" }];
    const incoming = [{ ...baseProject, updatedAt: "2026-06-20T02:00:00.000Z", goal: "updated" }];
    const plan = createProjectImportPlan(existing, incoming);

    expect(plan.created).toBe(0);
    expect(plan.updated).toBe(1);
    expect(plan.skipped).toBe(0);
    expect(plan.toUpsert[0]?.goal).toBe("updated");
  });

  it("skips when existing data is newer", () => {
    const existing = [{ ...baseProject, updatedAt: "2026-06-20T03:00:00.000Z" }];
    const incoming = [{ ...baseProject, updatedAt: "2026-06-20T02:00:00.000Z" }];
    const plan = createProjectImportPlan(existing, incoming);

    expect(plan.created).toBe(0);
    expect(plan.updated).toBe(0);
    expect(plan.skipped).toBe(1);
    expect(plan.toUpsert).toEqual([]);
  });

  it("deduplicates incoming entries by newest timestamp", () => {
    const older = { ...baseProject, updatedAt: "2026-06-20T02:00:00.000Z", goal: "older" };
    const newer = { ...baseProject, updatedAt: "2026-06-20T03:00:00.000Z", goal: "newer" };
    const plan = createProjectImportPlan([], [older, newer]);

    expect(plan.created).toBe(1);
    expect(plan.toUpsert).toHaveLength(1);
    expect(plan.toUpsert[0]?.goal).toBe("newer");
  });
});
