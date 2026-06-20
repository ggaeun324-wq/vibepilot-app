"use client";

import { useCallback, useEffect, useState } from "react";
import { Phase } from "@/types/project";

interface RecommendedTask {
  id: number;
  phase: string;
  task: string;
  description: string;
  reason: string;
}

interface RecommendStats {
  remainingDays: number;
  totalDays: number;
  currentProgress: number;
  idealProgress: number;
  isOnTrack: boolean;
  incompleteCount: number;
}

interface TodayRecommendProps {
  phases: Phase[];
  level: string;
  startDate: string;
  endDate: string;
}

interface RecommendResponse {
  recommendations: RecommendedTask[];
  insight: string;
  levelTip: string;
  stats: RecommendStats | null;
}

export default function TodayRecommend({ phases, level, startDate, endDate }: TodayRecommendProps) {
  const [recommendations, setRecommendations] = useState<RecommendedTask[]>([]);
  const [insight, setInsight] = useState("");
  const [levelTip, setLevelTip] = useState("");
  const [stats, setStats] = useState<RecommendStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = useCallback(async (): Promise<RecommendResponse> => {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phases, level, startDate, endDate }),
    });

    if (!res.ok) {
      throw new Error("추천을 불러오는 중 오류가 발생했어요.");
    }

    const data = await res.json();
    return {
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      insight: typeof data.insight === "string" ? data.insight : "",
      levelTip: typeof data.levelTip === "string" ? data.levelTip : "",
      stats: data.stats ?? null,
    };
  }, [endDate, level, phases, startDate]);

  const applyRecommendations = (data: RecommendResponse) => {
    setRecommendations(data.recommendations);
    setInsight(data.insight);
    setLevelTip(data.levelTip);
    setStats(data.stats);
  };

  const applyRecommendationError = (error: unknown) => {
    setRecommendations([]);
    setLevelTip("");
    setStats(null);
    setInsight(error instanceof Error ? error.message : "추천을 불러오는 중 오류가 발생했어요.");
  };

  useEffect(() => {
    let active = true;

    void fetchRecommendations()
      .then((data) => {
        if (!active) {
          return;
        }

        applyRecommendations(data);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        applyRecommendationError(error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchRecommendations]);

  const handleRefresh = () => {
    setLoading(true);
    void fetchRecommendations()
      .then(applyRecommendations)
      .catch(applyRecommendationError)
      .finally(() => {
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-gray-800">🎯 오늘의 추천 태스크</h3>
        <div className="flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded font-medium">AI 추천</span>
          <button
            onClick={handleRefresh}
            className="text-xs text-gray-400 hover:text-purple-500 transition-colors p-1"
            title="다시 추천받기"
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Progress insight */}
      {stats && (
        <div className={`text-sm px-3 py-2 rounded-lg mb-4 ${stats.isOnTrack ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
          {insight}
        </div>
      )}

      {/* Recommended tasks with actions */}
      <div className="space-y-3 mb-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {rec.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{rec.task}</p>
                <p className="text-xs text-gray-500">{rec.phase} · {rec.description}</p>
                <p className="text-xs text-purple-600 mt-1">💡 {rec.reason}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI transparency note */}
      <p className="text-[10px] text-gray-400 mb-3 flex items-center gap-1">
        <span>ℹ️</span>
        <span>AI가 진행 상황을 분석하여 추천한 내용입니다. 참고용으로 활용하세요.</span>
      </p>

      {/* Level tip */}
      {levelTip && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          {levelTip}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>남은 작업: {stats.incompleteCount}개</span>
          <span>D-{stats.remainingDays}</span>
          <span className={stats.isOnTrack ? "text-green-500" : "text-orange-500"}>
            {stats.isOnTrack ? "✅ 순조로움" : "⚡ 속도 업!"}
          </span>
        </div>
      )}
    </div>
  );
}
