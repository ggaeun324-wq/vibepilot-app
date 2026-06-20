import { NextRequest, NextResponse } from "next/server";

import { hashPassword, verifyLegacyPassword, verifyPassword } from "@/lib/auth-core";
import { createUserSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { validateLoginInput } from "@/lib/validation";

interface LegacyUserPayload {
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
}

function isLegacyUserPayload(value: unknown): value is LegacyUserPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.email === "string"
    && typeof payload.passwordHash === "string"
    && typeof payload.displayName === "string"
    && typeof payload.createdAt === "string";
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    email?: string;
    password?: string;
    legacyUser?: unknown;
  };

  const validation = validateLoginInput(body.email ?? "", body.password ?? "");
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  let user = await prisma.user.findUnique({
    where: {
      email: validation.value.email,
    },
  });

  if (!user) {
    if (!isLegacyUserPayload(body.legacyUser) || body.legacyUser.email.toLowerCase() !== validation.value.email) {
      return NextResponse.json({ error: "등록되지 않은 이메일입니다." }, { status: 401 });
    }

    if (!verifyLegacyPassword(validation.value.password, body.legacyUser.passwordHash)) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    user = await prisma.user.create({
      data: {
        email: validation.value.email,
        passwordHash: await hashPassword(validation.value.password),
        displayName: body.legacyUser.displayName,
        createdAt: new Date(body.legacyUser.createdAt),
      },
    });
  } else {
    const passwordMatches = await verifyPassword(validation.value.password, user.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }
  }

  await createUserSession(user.id);

  return NextResponse.json({
    auth: {
      isLoggedIn: true,
      email: user.email,
      displayName: user.displayName,
    },
    user: {
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
