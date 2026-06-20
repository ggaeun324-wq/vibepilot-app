import { SavedProject } from "@/lib/project-data";

export interface ProjectImportPlan {
  created: number;
  skipped: number;
  toUpsert: SavedProject[];
  updated: number;
}

function getTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function keepNewestById(projects: SavedProject[]): SavedProject[] {
  const projectMap = new Map<string, SavedProject>();

  for (const project of projects) {
    const existing = projectMap.get(project.id);
    if (!existing || getTimestamp(project.updatedAt) > getTimestamp(existing.updatedAt)) {
      projectMap.set(project.id, project);
    }
  }

  return [...projectMap.values()];
}

export function createProjectImportPlan(
  existingProjects: SavedProject[],
  incomingProjects: SavedProject[],
): ProjectImportPlan {
  const existingById = new Map(existingProjects.map((project) => [project.id, project]));
  const toUpsert: SavedProject[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const incoming of keepNewestById(incomingProjects)) {
    const existing = existingById.get(incoming.id);

    if (!existing) {
      created += 1;
      toUpsert.push(incoming);
      continue;
    }

    if (getTimestamp(incoming.updatedAt) > getTimestamp(existing.updatedAt)) {
      updated += 1;
      toUpsert.push({
        ...incoming,
        createdAt: getTimestamp(existing.createdAt) <= getTimestamp(incoming.createdAt)
          ? existing.createdAt
          : incoming.createdAt,
      });
      continue;
    }

    skipped += 1;
  }

  return {
    created,
    skipped,
    toUpsert,
    updated,
  };
}
