"use client";

import { UserLevel, LEVEL_CONFIG } from "@/types/project";

interface LevelSelectorProps {
  onSelect: (level: UserLevel) => void;
  selectedLevel?: UserLevel;
}

export default function LevelSelector({ onSelect, selectedLevel }: LevelSelectorProps) {
  const levels: UserLevel[] = ["beginner", "intermediate", "advanced"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mx-auto">
      {levels.map((level) => {
        const config = LEVEL_CONFIG[level];
        const isSelected = selectedLevel === level;

        return (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`
              relative p-8 rounded-3xl border-2 transition-all duration-300
              hover:scale-105 hover:shadow-xl
              ${isSelected
                ? `${config.borderColor} ${config.bgColor} shadow-lg scale-105`
                : "border-gray-200 bg-white hover:border-amber-300"
              }
            `}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="text-5xl mb-4">
              {level === "beginner" && "🌱"}
              {level === "intermediate" && "🌿"}
              {level === "advanced" && "🌳"}
            </div>
            <h3 className="text-xl font-bold mb-2">{config.label}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
            <div className="mt-4 text-xs text-gray-400">
              {config.phases.length}단계 여정
            </div>
          </button>
        );
      })}
    </div>
  );
}
