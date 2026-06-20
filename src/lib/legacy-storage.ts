import { LEGACY_PROJECTS_KEY, getLegacyUserProjectsKey } from "@/lib/persistence-keys";
import { isSavedProject, SavedProject, toProjectPayload } from "@/lib/project-data";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readProjects(key: string): SavedProject[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter(isSavedProject) : [];
}

function writeProjects(key: string, projects: SavedProject[]): void {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(projects.map(toProjectPayload)));
}

export function getGuestProjects(): SavedProject[] {
  return readProjects(LEGACY_PROJECTS_KEY);
}

export function saveGuestProject(project: SavedProject): void {
  const projects = getGuestProjects();
  const existingIndex = projects.findIndex((candidate) => candidate.id === project.id);
  const nextProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    projects[existingIndex] = nextProject;
  } else {
    projects.push(nextProject);
  }

  writeProjects(LEGACY_PROJECTS_KEY, projects);
}

export function deleteGuestProject(projectId: string): void {
  const remaining = getGuestProjects().filter((project) => project.id !== projectId);
  writeProjects(LEGACY_PROJECTS_KEY, remaining);
}

export function getLegacyProjectsForUser(email: string): SavedProject[] {
  return readProjects(getLegacyUserProjectsKey(email));
}

export function getLegacyMigrationPayload(email: string): {
  anonymousProjects: SavedProject[];
  userProjects: SavedProject[];
} {
  return {
    anonymousProjects: getGuestProjects(),
    userProjects: getLegacyProjectsForUser(email),
  };
}
