"use client";

interface MascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  percentage?: number;
}

function getMascotEmoji(percentage: number) {
  if (percentage === 0) return "🥚";
  if (percentage < 25) return "🐣";
  if (percentage < 50) return "🐥";
  if (percentage < 75) return "🐔";
  if (percentage < 100) return "🦅";
  return "🏆";
}

function getMascotLabel(percentage: number) {
  if (percentage === 0) return "알";
  if (percentage < 25) return "병아리 탄생!";
  if (percentage < 50) return "아기 병아리";
  if (percentage < 75) return "성장한 닭";
  if (percentage < 100) return "날개를 펼친 독수리";
  return "전설의 개발자!";
}

export default function Mascot({ message, size = "md", percentage = 0 }: MascotProps) {
  const sizeClasses = {
    sm: "text-4xl",
    md: "text-6xl",
    lg: "text-8xl",
  };

  const emoji = getMascotEmoji(percentage);
  const label = getMascotLabel(percentage);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`animate-bounce-slow ${sizeClasses[size]}`}>
        {emoji}
      </div>
      {percentage > 0 && (
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
          {label}
        </span>
      )}
      {message && (
        <div className="relative bg-white rounded-2xl px-4 py-2 shadow-md border border-amber-200 max-w-xs text-center">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-amber-200 rotate-45" />
          <p className="text-sm text-gray-700 relative z-10">{message}</p>
        </div>
      )}
    </div>
  );
}
