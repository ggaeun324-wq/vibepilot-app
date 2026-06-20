"use client";

import { Phase } from "@/types/project";
import { calculatePhaseTargets, calculateProgress, calculateTimeProgress } from "@/lib/storage";

interface ProgressInsightProps {
  phases: Phase[];
  startDate: string;
  endDate: string;
}

export default function ProgressInsight({ phases, startDate, endDate }: ProgressInsightProps) {
  const timeline = calculateTimeProgress(startDate, endDate);
  const { remainingDays, totalDays, elapsedDays } = timeline;
  const { phaseTargets, expectedCompleted, timeProgress } = calculatePhaseTargets(phases, startDate, endDate, timeline);
  const { totalSteps, completedSteps, percentage: actualProgress } = calculateProgress(phases);
  const hasStarted = completedSteps > 0;

  // Time progress only counts when user has started clicking
  const displayedElapsed = hasStarted ? elapsedDays : 0;

  const gap = actualProgress - timeProgress;
  const isAhead = hasStarted && gap > 5;
  const isBehind = hasStarted && gap < -10;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" suppressHydrationWarning>
      <h3 className="text-lg font-bold text-gray-800 mb-4">📈 진행도 분석</h3>

      {/* Time vs Progress comparison */}
      <div className="mb-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>⏰ 시간 경과</span>
            <span>{displayedElapsed}/{totalDays}일 ({timeProgress}%)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${timeProgress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>✅ 실제 진행</span>
            <span>{completedSteps}/{totalSteps}개 ({actualProgress}%)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isBehind ? "bg-red-400" : isAhead ? "bg-green-400" : "bg-amber-400"}`} style={{ width: `${actualProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Status message */}
      <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${
        completedSteps === 0 ? "bg-blue-50 text-blue-700" :
        isBehind ? "bg-red-50 text-red-700" : isAhead ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}>
        {completedSteps === 0 && "✨ 첫 단계를 체크하면 진행도 분석이 시작돼요!"}
        {completedSteps > 0 && isBehind && `⚠️ 목표 대비 ${Math.abs(gap)}% 뒤쳐져 있어요! ${expectedCompleted - completedSteps}개 더 완료해야 정상 페이스에요.`}
        {completedSteps > 0 && isAhead && `🎉 목표보다 ${gap}% 앞서가고 있어요! 이 속도면 ${remainingDays > 0 ? `${Math.max(1, remainingDays - Math.floor(gap / 10))}일 일찍` : "이미"} 끝낼 수 있어요!`}
        {completedSteps > 0 && !isBehind && !isAhead && `👍 순조로운 페이스! D-${remainingDays}까지 매일 ${Math.max(1, Math.ceil((totalSteps - completedSteps) / Math.max(1, remainingDays)))}개씩 하면 됩니다.`}
      </div>

      {/* Phase-level targets */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">단계별 상태</p>
        {phaseTargets.map((target) => (
          <div key={target.phaseId} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              target.status === "completed" ? "bg-green-400" :
              target.status === "current" ? (target.isOnTrack ? "bg-amber-400" : "bg-orange-400") :
              "bg-gray-300"
            }`} />
            <span className="flex-1 text-gray-700">{target.phaseName}</span>
            <span className="text-gray-400">
              {target.completedSteps}/{target.totalSteps}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              target.status === "completed" ? "bg-green-100 text-green-700" :
              target.status === "current" ? (target.isOnTrack ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700") :
              "bg-gray-100 text-gray-500"
            }`}>
              {target.status === "completed" ? "완료" :
               target.status === "current" ? (target.isOnTrack ? "진행 중" : "지연") :
               "예정"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
