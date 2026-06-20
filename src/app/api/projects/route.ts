import { NextRequest, NextResponse } from "next/server";

import { fromDatabaseProject, isSavedProject, toPrismaPhases } from "@/lib/project-data";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return NextResponse.json({
    projects: projects.map(fromDatabaseProject),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const project = await request.json() as unknown;
  if (!isSavedProject(project)) {
    return NextResponse.json({ error: "프로젝트 형식이 올바르지 않습니다." }, { status: 400 });
  }

  await prisma.project.upsert({
    where: {
      userId_clientId: {
        userId: user.id,
        clientId: project.id,
      },
    },
    create: {
      userId: user.id,
      clientId: project.id,
      name: project.name,
      level: project.level,
      goal: project.goal,
      startDate: project.startDate,
      endDate: project.endDate,
      phases: toPrismaPhases(project.phases),
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    },
    update: {
      name: project.name,
      level: project.level,
      goal: project.goal,
      startDate: project.startDate,
      endDate: project.endDate,
      phases: toPrismaPhases(project.phases),
      updatedAt: new Date(project.updatedAt),
    },
  });

  return NextResponse.json({ ok: true });
}
