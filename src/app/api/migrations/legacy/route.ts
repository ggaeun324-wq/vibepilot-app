import { NextRequest, NextResponse } from "next/server";

import { createProjectImportPlan } from "@/lib/project-merge";
import { fromDatabaseProject, isSavedProject, SavedProject, toPrismaPhases } from "@/lib/project-data";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";

function isSavedProjectList(value: unknown): value is SavedProject[] {
  return Array.isArray(value) && value.every(isSavedProject);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json() as {
    email?: string;
    anonymousProjects?: unknown;
    userProjects?: unknown;
  };

  if (typeof body.email !== "string" || body.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "현재 로그인 계정과 이전 대상이 일치하지 않습니다." }, { status: 400 });
  }

  if (!isSavedProjectList(body.anonymousProjects) || !isSavedProjectList(body.userProjects)) {
    return NextResponse.json({ error: "이전할 프로젝트 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const existingProjects = await prisma.project.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  const importPlan = createProjectImportPlan(
    existingProjects.map(fromDatabaseProject),
    [...body.userProjects, ...body.anonymousProjects],
  );

  if (importPlan.toUpsert.length > 0) {
    await prisma.$transaction(importPlan.toUpsert.map((project) => {
      return prisma.project.upsert({
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
    }));
  }

  return NextResponse.json({
    created: importPlan.created,
    updated: importPlan.updated,
    skipped: importPlan.skipped,
  });
}
