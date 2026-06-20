"use client";

import { useState } from "react";
import { Phase } from "@/types/project";
import { calculatePhaseTargets } from "@/lib/storage";

interface PhaseTimelineProps {
  phases: Phase[];
  onToggleStep: (phaseId: string, stepId: string) => void;
  startDate?: string;
  endDate?: string;
}

export default function PhaseTimeline({ phases, onToggleStep, startDate, endDate }: PhaseTimelineProps) {
  const [hoveredGuide, setHoveredGuide] = useState<string | null>(null);

  const phaseTargets = startDate && endDate
    ? calculatePhaseTargets(phases, startDate, endDate).phaseTargets
    : null;

  // Find the first incomplete step globally
  let nextStepId: string | null = null;
  for (const phase of phases) {
    const step = phase.steps.find((s) => !s.completed);
    if (step) { nextStepId = step.id; break; }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4" suppressHydrationWarning>
      {phases.map((phase, phaseIdx) => {
        const completedSteps = phase.steps.filter((s) => s.completed).length;
        const totalSteps = phase.steps.length;
        const phaseProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
        const isComplete = completedSteps === totalSteps;
        const target = phaseTargets?.[phaseIdx];

        return (
          <div key={phase.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                        ${isComplete ? "bg-green-100" : "bg-amber-50"}`}
                  >
                    {phase.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {phaseIdx + 1}. {phase.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {completedSteps}/{totalSteps} 완료
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {target && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      target.status === "completed" ? "bg-green-100 text-green-700" :
                      target.status === "current" ? (target.isOnTrack ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700") :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {target.status === "completed" ? "✅ 완료" :
                       target.status === "current" ? (target.isOnTrack ? "🔄 진행 중" : `⚠️ ${target.expectedProgress - target.actualProgress}% 지연`) :
                       "⏳ 예정"}
                    </span>
                  )}
                  <span className="text-sm font-bold w-12 text-right" style={{
                    color: isComplete ? "#10b981" : phaseProgress > 0 ? "#f59e0b" : "#9ca3af"
                  }}>
                    {phaseProgress}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? "bg-green-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {phase.steps.map((step) => (
                <div key={step.id} className="relative flex items-center gap-2">
                  <button
                    onClick={() => onToggleStep(phase.id, step.id)}
                    className={`flex-1 text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3
                      ${step.completed
                        ? "bg-green-50 border-green-200"
                        : step.id === nextStepId
                          ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200"
                          : "bg-gray-50 border-gray-100 hover:bg-amber-50 hover:border-amber-200"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${step.completed ? "border-green-400 bg-green-400" : step.id === nextStepId ? "border-amber-400" : "border-gray-300"}`}
                    >
                      {step.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${step.completed ? "text-green-700 line-through" : "text-gray-700"}`}>
                          {step.title}
                        </p>
                        {step.id === nextStepId && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-semibold">
                            👉 다음
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{step.description}</p>
                    </div>
                  </button>

                  {/* Guide tooltip trigger */}
                  {step.guide && (
                    <div
                      className="relative flex-shrink-0"
                      onMouseEnter={() => setHoveredGuide(step.id)}
                      onMouseLeave={() => setHoveredGuide(null)}
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold cursor-help hover:bg-amber-200 transition-colors">
                        ?
                      </div>

                      {/* Tooltip */}
                      {hoveredGuide === step.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-gray-800 text-white text-sm rounded-xl shadow-xl z-50">
                          <div className="font-semibold text-amber-300 mb-1">
                            💡 {step.title} 가이드
                          </div>
                          <p className="text-gray-200 text-xs leading-relaxed">
                            {step.guide}
                          </p>
                          <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
