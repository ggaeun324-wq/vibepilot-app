import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Phase } from "@/types/project";

import { POST } from "./route";

describe("POST /api/recommend", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("suggests the first three tasks and start guidance before progress begins", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00.000Z"));

    const response = await POST(
      createRequest({
        phases: createPhases([
          [false, false],
          [false, false],
        ]),
        level: "beginner",
        startDate: "2026-06-10",
        endDate: "2026-06-20",
      }),
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload.recommendations).toMatchObject([
      {
        id: 1,
        phase: "기획",
        task: "아이디어 정의",
        reason: "가장 우선순위가 높은 다음 단계",
      },
      {
        id: 2,
        phase: "기획",
        task: "문제 정의",
        reason: "순서상 바로 다음 작업",
      },
      {
        id: 3,
        phase: "구현",
        task: "핵심 기능 구현",
        reason: "오늘 같이 처리하면 좋을 작업",
      },
    ]);
    expect(payload.insight).toBe("✨ 첫 단계를 체크해서 여정을 시작해보세요! 시작이 반이에요!");
    expect(payload.levelTip).toContain("초보자 팁");
    expect(payload.stats).toMatchObject({
      remainingDays: 10,
      totalDays: 10,
      currentProgress: 0,
      idealProgress: 0,
      isOnTrack: true,
      incompleteCount: 4,
    });
  });

  it("warns when progress is behind the ideal schedule", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T00:00:00.000Z"));

    const response = await POST(
      createRequest({
        phases: createPhases([
          [true, false],
          [false, false],
        ]),
        level: "intermediate",
        startDate: "2026-06-10",
        endDate: "2026-06-20",
      }),
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload.recommendations).toMatchObject([
      {
        id: 1,
        phase: "기획",
        task: "문제 정의",
      },
      {
        id: 2,
        phase: "구현",
        task: "핵심 기능 구현",
      },
      {
        id: 3,
        phase: "구현",
        task: "통합 점검",
      },
    ]);
    expect(payload.insight).toBe("📊 현재 진행도가 목표보다 55% 뒤쳐져 있어요. 오늘 3개를 완료하면 따라잡을 수 있어요!");
    expect(payload.levelTip).toContain("중급자 팁");
    expect(payload.stats).toMatchObject({
      remainingDays: 2,
      totalDays: 10,
      currentProgress: 25,
      idealProgress: 80,
      isOnTrack: false,
      incompleteCount: 3,
    });
  });
});

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createPhases(completedMatrix: boolean[][]): Phase[] {
  return [
    {
      id: "planning",
      name: "기획",
      emoji: "🎯",
      steps: completedMatrix[0]!.map((completed, index) => ({
        id: `planning-${index + 1}`,
        title: index === 0 ? "아이디어 정의" : "문제 정의",
        description: "설명",
        completed,
      })),
    },
    {
      id: "build",
      name: "구현",
      emoji: "🔧",
      steps: completedMatrix[1]!.map((completed, index) => ({
        id: `build-${index + 1}`,
        title: index === 0 ? "핵심 기능 구현" : "통합 점검",
        description: "설명",
        completed,
      })),
    },
  ];
}
