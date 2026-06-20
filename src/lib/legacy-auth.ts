import { LEGACY_USERS_KEY } from "@/lib/persistence-keys";

export interface LegacyUser {
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isLegacyUser(value: unknown): value is LegacyUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.email === "string"
    && typeof candidate.passwordHash === "string"
    && typeof candidate.displayName === "string"
    && typeof candidate.createdAt === "string";
}

export function simpleHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export function getLegacyUsers(): LegacyUser[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(LEGACY_USERS_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter(isLegacyUser) : [];
}

export function getLegacyUserByEmail(email: string): LegacyUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  return getLegacyUsers().find((user) => user.email.toLowerCase() === normalizedEmail) ?? null;
}
