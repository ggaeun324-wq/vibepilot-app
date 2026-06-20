export const SESSION_COOKIE_NAME = "vibepilot_session";
export const LEGACY_USERS_KEY = "vibepilot_users";
export const LEGACY_AUTH_KEY = "vibepilot_auth";
export const LEGACY_PROJECTS_KEY = "vibepilot_projects";

export function getLegacyUserProjectsKey(email: string): string {
  return `${LEGACY_PROJECTS_KEY}_${email.trim().toLowerCase()}`;
}
