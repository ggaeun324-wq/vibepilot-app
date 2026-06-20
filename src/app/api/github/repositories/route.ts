import { NextRequest, NextResponse } from "next/server";

import { GitHubApiError, listAccessibleRepositories, sanitizeGitHubToken, validateGitHubToken } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { token?: string; query?: string };
  const token = body.token ? sanitizeGitHubToken(body.token) : "";

  if (!token) {
    return NextResponse.json({ error: "GitHub PAT를 입력해주세요." }, { status: 400 });
  }

  try {
    await validateGitHubToken(token);
    const repositories = await listAccessibleRepositories(token, body.query, 50);
    return NextResponse.json({ repositories });
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof GitHubApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json(
    { error: "레포 목록을 불러오는 중 오류가 발생했어요." },
    { status: 500 },
  );
}
