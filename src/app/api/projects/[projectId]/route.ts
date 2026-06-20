import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { projectId } = await context.params;

  await prisma.project.deleteMany({
    where: {
      userId: user.id,
      clientId: projectId,
    },
  });

  return NextResponse.json({ ok: true });
}
