"use client";

import { useState } from "react";

import { RepositoryAccessSelection, RepositoryOption } from "@/lib/github";
import { RepositoryAnalysis } from "@/lib/repo-analysis";

interface RepoAnalyzerProps {
  onRepositoryAccessChange?: (access: RepositoryAccessSelection | null) => void;
}

export default function RepoAnalyzer({ onRepositoryAccessChange }: RepoAnalyzerProps) {
  const [token, setToken] = useState("");
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filteredRepositories = repositories.filter((repository) =>
    !search.trim()
      ? true
      : repository.fullName.toLowerCase().includes(search.trim().toLowerCase()) ||
        repository.description?.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selectedRepo = repositories.find((repository) => repository.fullName === selectedRepository) ?? null;

  const loadRepositories = async () => {
    if (!token.trim()) return;

    setLoadingRepos(true);
    setError("");
    setAnalysis(null);
    setSelectedRepository("");
    onRepositoryAccessChange?.(null);

    try {
      const response = await fetch("/api/github/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "레포 목록을 불러오지 못했어요.");
        setRepositories([]);
        return;
      }

      setRepositories(data.repositories ?? []);
      if ((data.repositories ?? []).length === 0) {
        setError("이 토큰으로 접근 가능한 레포를 찾지 못했어요.");
      }
    } catch {
      setError("레포 목록을 불러오는 중 오류가 발생했어요.");
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const analyzeRepo = async () => {
    if (!token.trim() || !selectedRepository) return;

    setLoadingAnalysis(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubToken: token,
          fullName: selectedRepository,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error);
      } else {
        setAnalysis(data.analysis);
        if (selectedRepo) {
          onRepositoryAccessChange?.({
            repo: selectedRepo,
            token,
          });
        }
      }
    } catch {
      setError("분석 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📊 GitHub 레포 분석</h3>

      <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
        GitHub PAT는 <span className="font-semibold">저장하지 않고</span> 현재 브라우저 메모리에서만 사용해요.
        Private 레포 분석을 위해서는 Fine-grained PAT 기준으로 <span className="font-semibold">Metadata: Read</span>,
        <span className="font-semibold"> Contents: Read</span> 권한을 권장해요.
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setRepositories([]);
              setSelectedRepository("");
              setAnalysis(null);
              onRepositoryAccessChange?.(null);
            }}
            placeholder="GitHub Personal Access Token"
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
          />
          <button
            onClick={loadRepositories}
            disabled={loadingRepos || !token.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loadingRepos ? "불러오는 중..." : "레포 불러오기"}
          </button>
        </div>

        {repositories.length > 0 && (
          <>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="레포 검색"
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
            <div className="flex gap-2">
              <select
                value={selectedRepository}
                onChange={(event) => {
                  setSelectedRepository(event.target.value);
                  setAnalysis(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">분석할 레포를 선택하세요</option>
                {filteredRepositories.map((repository) => (
                  <option key={repository.id} value={repository.fullName}>
                    {repository.fullName} {repository.private ? "🔒" : "🌍"}
                  </option>
                ))}
              </select>
              <button
                onClick={analyzeRepo}
                disabled={loadingAnalysis || !selectedRepository}
                className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {loadingAnalysis ? "분석 중..." : "분석"}
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">{analysis.repoName}</h4>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                ⭐ {analysis.stars}
              </span>
            </div>
            <p className="text-sm text-gray-500">{analysis.description}</p>
          </div>

          {analysis.languages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">사용 언어</p>
              <div className="flex gap-2 flex-wrap">
                {analysis.languages.map((language) => (
                  <span key={language.name} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                    {language.name} {language.percentage}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-800">
                🔍 추정 단계: {analysis.estimatedPhase}
              </span>
              <span className="text-lg font-bold text-indigo-600">
                {analysis.estimatedProgress}%
              </span>
            </div>
            <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all"
                style={{ width: `${analysis.estimatedProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">프로젝트 건강도:</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  analysis.healthScore >= 70 ? "bg-green-400" : analysis.healthScore >= 40 ? "bg-yellow-400" : "bg-red-400"
                }`}
                style={{ width: `${analysis.healthScore}%` }}
              />
            </div>
            <span className="text-sm font-medium">{analysis.healthScore}/100</span>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">💡 AI 추천 사항</p>
            <div className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-indigo-500 flex-shrink-0">→</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {analysis.inspectedFiles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">🧩 분석에 사용한 파일</p>
              <div className="flex flex-wrap gap-2">
                {analysis.inspectedFiles.map((filePath) => (
                  <span
                    key={filePath}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {filePath}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
