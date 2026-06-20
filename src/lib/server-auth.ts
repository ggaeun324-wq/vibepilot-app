import { cookies } from "next/headers";

import {
  createSessionToken,
  getSessionCookieOptions,
  getSessionExpiryDate,
  hashSessionToken,
} from "@/lib/auth-core";
import { SESSION_COOKIE_NAME } from "@/lib/persistence-keys";
import { prisma } from "@/lib/prisma";

export async function createUserSession(userId: string): Promise<void> {
  const token = createSessionToken();
  const expiresAt = getSessionExpiryDate();

  await prisma.authSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));
}

export async function destroyUserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.authSession.delete({
      where: {
        id: session.id,
      },
    });
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session.user;
}
