import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { phases, level, startDate, endDate } = await req.json();

  const today = new Date();
  const end = new Date(endDate);
  const start = new Date(startDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = totalDays - remainingDays;

  // Find incomplete steps
  const incompleteSteps: { phaseId: string; phaseName: string; stepTitle: string; stepDescription: string; priority: number }[] = [];

  phases.forEach((phase: { id: string; name: string; steps: { completed: boolean; title: string; description: string }[] }, phaseIdx: number) => {
    phase.steps.forEach((step) => {
      if (!step.completed) {
        incompleteSteps.push({
          phaseId: phase.id,
          phaseName: phase.name,
          stepTitle: step.title,
          stepDescription: step.description,
          priority: phaseIdx,
        });
      }
    });
  });

  // Calculate ideal progress - only show if user has started
  const totalSteps = phases.reduce((acc: number, p: { steps: unknown[] }) => acc + p.steps.length, 0);
  const completedSteps = totalSteps - incompleteSteps.length;
  const hasStarted = completedSteps > 0;
  const currentProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const idealProgress = hasStarted && totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
  const isOnTrack = !hasStarted || currentProgress >= idealProgress - 10;

  // Pick top 3 recommended tasks
  const recommendations = incompleteSteps.slice(0, 3).map((step, idx) => ({
    id: idx + 1,
    phase: step.phaseName,
    task: step.stepTitle,
    description: step.stepDescription,
    reason: idx === 0 ? "가장 우선순위가 높은 다음 단계" : idx === 1 ? "순서상 바로 다음 작업" : "오늘 같이 처리하면 좋을 작업",
  }));

  // Generate AI insight
  let insight: string;
  if (!hasStarted) {
    insight = "✨ 첫 단계를 체크해서 여정을 시작해보세요! 시작이 반이에요!";
  } else if (remainingDays === 0) {
    insight = "⚠️ 오늘이 마감일이에요! 가장 중요한 기능에 집중하세요.";
  } else if (!isOnTrack) {
    const gap = Math.round(idealProgress - currentProgress);
    insight = `📊 현재 진행도가 목표보다 ${gap}% 뒤쳐져 있어요. 오늘 ${Math.min(3, incompleteSteps.length)}개를 완료하면 따라잡을 수 있어요!`;
  } else if (currentProgress > idealProgress + 10) {
    insight = "🎉 목표보다 앞서가고 있어요! 이 속도면 여유롭게 완성할 수 있어요.";
  } else {
    insight = "👍 순조롭게 진행 중이에요! 이 페이스를 유지하세요.";
  }

  const levelTip = level === "beginner"
    ? "💡 초보자 팁: 각 단계에서 AI에게 '이걸 어떻게 하면 돼?'라고 물어보세요!"
    : level === "intermediate"
    ? "💡 중급자 팁: 코드 리뷰를 AI에게 요청하면 품질이 올라가요!"
    : "💡 고급자 팁: 아키텍처 결정을 문서화해두면 나중에 유지보수가 쉬워요!";

  return NextResponse.json({
    recommendations,
    insight,
    levelTip,
    stats: {
      remainingDays,
      totalDays,
      currentProgress: Math.round(currentProgress),
      idealProgress: Math.round(idealProgress),
      isOnTrack,
      incompleteCount: incompleteSteps.length,
    },
  });
}
