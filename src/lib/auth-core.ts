import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import { simpleHash } from "@/lib/legacy-auth";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export function verifyLegacyPassword(password: string, legacyHash: string): boolean {
  return simpleHash(password) === legacyHash;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiryDate(): Date {
  return new Date(Date.now() + (SESSION_MAX_AGE_SECONDS * 1000));
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
