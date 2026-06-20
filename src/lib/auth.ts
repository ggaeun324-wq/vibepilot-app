import { getLegacyUserByEmail } from "@/lib/legacy-auth";
import { getLegacyMigrationPayload } from "@/lib/legacy-storage";

export interface User {
  email: string;
  displayName: string;
  createdAt?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  email: string | null;
  displayName: string | null;
}

interface AuthResponse {
  auth: AuthState;
  user?: User;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function toAuthResult(data: unknown): AuthResponse {
  if (!isRecord(data) || !isRecord(data.auth)) {
    return {
      auth: {
        isLoggedIn: false,
        email: null,
        displayName: null,
      },
      error: "응답 형식이 올바르지 않습니다.",
    };
  }

  const auth = data.auth;
  return {
    auth: {
      isLoggedIn: auth.isLoggedIn === true,
      email: typeof auth.email === "string" ? auth.email : null,
      displayName: typeof auth.displayName === "string" ? auth.displayName : null,
    },
    user: isRecord(data.user)
      && typeof data.user.email === "string"
      && typeof data.user.displayName === "string"
        ? {
            email: data.user.email,
            displayName: data.user.displayName,
            createdAt: typeof data.user.createdAt === "string" ? data.user.createdAt : undefined,
          }
        : undefined,
    error: typeof data.error === "string" ? data.error : undefined,
  };
}

async function migrateLegacyProjects(email: string): Promise<void> {
  const payload = getLegacyMigrationPayload(email);
  if (payload.anonymousProjects.length === 0 && payload.userProjects.length === 0) {
    return;
  }

  const response = await fetch("/api/migrations/legacy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      ...payload,
    }),
  });

  if (!response.ok) {
    const data = toAuthResult(await readJson(response));
    throw new Error(data.error ?? "기존 데이터를 이전하지 못했습니다.");
  }
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  const legacyUser = getLegacyUserByEmail(email);
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      displayName,
      legacyUser,
    }),
  });

  const data = toAuthResult(await readJson(response));
  if (!response.ok) {
    return { success: false, error: data.error ?? "가입 실패" };
  }

  await migrateLegacyProjects(data.user?.email ?? email);
  return { success: true, user: data.user };
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string; user?: User }> {
  const legacyUser = getLegacyUserByEmail(email);
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      legacyUser,
    }),
  });

  const data = toAuthResult(await readJson(response));
  if (!response.ok) {
    return { success: false, error: data.error ?? "로그인 실패" };
  }

  await migrateLegacyProjects(data.user?.email ?? email);
  return { success: true, user: data.user };
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    const data = toAuthResult(await readJson(response));
    throw new Error(data.error ?? "로그아웃에 실패했습니다.");
  }
}

export async function getAuthState(): Promise<AuthState> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  });

  const data = toAuthResult(await readJson(response));
  if (!response.ok) {
    throw new Error(data.error ?? "세션 정보를 불러오지 못했습니다.");
  }

  return data.auth;
}
