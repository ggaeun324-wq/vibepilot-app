import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth-core";
import { createUserSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { validateRegistrationInput } from "@/lib/validation";

function isLegacyUserPayload(value: unknown): value is { email: string } {
  return typeof value === "object"
    && value !== null
    && typeof (value as { email?: unknown }).email === "string";
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    email?: string;
    password?: string;
    displayName?: string;
    legacyUser?: unknown;
  };

  const validation = validateRegistrationInput(
    body.email ?? "",
    body.password ?? "",
    body.displayName ?? "",
  );

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (isLegacyUserPayload(body.legacyUser) && body.legacyUser.email.toLowerCase() === validation.value.email) {
    return NextResponse.json(
      { error: "기존 로컬 계정이 있어요. 로그인으로 데이터를 이전해 주세요." },
      { status: 409 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: validation.value.email,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: validation.value.email,
      passwordHash: await hashPassword(validation.value.password),
      displayName: validation.value.displayName,
    },
  });

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
