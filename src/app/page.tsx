"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AIChat from "@/components/AIChat";
import AICoachPanel from "@/components/AICoachPanel";
import Header from "@/components/Header";
import LevelSelector from "@/components/LevelSelector";
import LoginModal from "@/components/LoginModal";
import Mascot from "@/components/Mascot";
import MyPage from "@/components/MyPage";
import PhaseTimeline from "@/components/PhaseTimeline";
import ProgressInsight from "@/components/ProgressInsight";
import ProgressRing from "@/components/ProgressRing";
import RepoAnalyzer from "@/components/RepoAnalyzer";
import TodayRecommend from "@/components/TodayRecommend";
import { getAuthState, logout as doLogout, User } from "@/lib/auth";
import { RepositoryAccessSelection } from "@/lib/github";
import { buildSavedProject, calculateProgress, getAllProjects, generateProjectId, saveProject, SavedProject } from "@/lib/storage";
import { ALL_PHASES, LEVEL_CONFIG, Phase, UserLevel } from "@/types/project";

type PageView = "home" | "mypage";
type DashboardTab = "overview" | "timeline";

export default function Home() {
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [started, setStarted] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pageView, setPageView] = useState<PageView>("home");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("overview");
  const [repositoryAccess, setRepositoryAccess] = useState<RepositoryAccessSelection | null>(null);
  const skipNextPersistRef = useRef(false);

  const loadProject = useCallback((project: SavedProject) => {
    skipNextPersistRef.current = true;
    setProjectId(project.id);
    setProjectName(project.name);
    setLevel(project.level);
    setGoal(project.goal);
    setStartDate(project.startDate);
    setEndDate(project.endDate);
    setPhases(project.phases);
    setProjectCreatedAt(project.createdAt);
    setStarted(true);
    setRepositoryAccess(null);
    setDashboardTab("overview");
    setPageView("home");
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      try {
        const auth = await getAuthState();
        const projects = await getAllProjects();

        if (!active) {
          return;
        }

        setIsLoggedIn(auth.isLoggedIn);
        setDisplayName(auth.displayName);
        if (projects.length > 0) {
          loadProject(projects[projects.length - 1]);
        }
      } catch (error) {
        console.error("Failed to hydrate session state", error);
      }
    };

    void hydrateSession();

    return () => {
      active = false;
    };
  }, [loadProject]);

  useEffect(() => {
    if (!started || !projectId || !level) {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const persistProject = async () => {
      const project = buildSavedProject({
        id: projectId,
        name: projectName,
        level,
        goal,
        startDate,
        endDate,
        phases,
        createdAt: projectCreatedAt,
      });

      try {
        await saveProject(project);
      } catch (error) {
        console.error("Failed to save project", error);
      }
    };

    void persistProject();
  }, [endDate, goal, level, phases, projectCreatedAt, projectId, projectName, startDate, started]);

  const handleLoginSuccess = async (user: User) => {
    setIsLoggedIn(true);
    setDisplayName(user.displayName);
    try {
      const projects = await getAllProjects();
      if (projects.length > 0) {
        loadProject(projects[projects.length - 1]);
      }
    } catch (error) {
      console.error("Failed to load projects after login", error);
    }
  };

  const handleLogout = async () => {
    await doLogout();
    setIsLoggedIn(false);
    setDisplayName(null);
    setRepositoryAccess(null);
    handleNewProject();
  };

  const handleLevelSelect = (selectedLevel: UserLevel) => {
    setLevel(selectedLevel);
    const config = LEVEL_CONFIG[selectedLevel];
    const filteredPhases = ALL_PHASES
      .filter((phase) => (config.phases as readonly string[]).includes(phase.id))
      .map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => ({ ...step, completed: false })),
      }));
    setPhases(filteredPhases);
  };

  const handleStart = () => {
    if (!level || !projectName.trim() || !startDate || !endDate) return;
    setProjectId(generateProjectId());
    setProjectCreatedAt(new Date().toISOString());
    setStarted(true);
    setDashboardTab("overview");
  };

  const handleNewProject = () => {
    setStarted(false);
    setLevel(null);
    setPhases([]);
    setProjectName("");
    setStartDate("");
    setEndDate("");
    setGoal("");
    setProjectId("");
    setProjectCreatedAt(null);
    setRepositoryAccess(null);
    setPageView("home");
    setDashboardTab("overview");
  };

  const handleToggleStep = useCallback((phaseId: string, stepId: string) => {
    setPhases((previous) =>
      previous.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              steps: phase.steps.map((step) =>
                step.id === stepId ? { ...step, completed: !step.completed } : step,
              ),
            }
          : phase,
      ),
    );
  }, []);

  const { totalSteps, completedSteps, percentage } = calculateProgress(phases);
  const currentPhaseName = phases.find((phase) => phase.steps.some((step) => !step.completed))?.name ?? "완료";
  const inferredRepoUrl = repositoryAccess?.repo.htmlUrl ?? (projectName.includes("github.com/") ? projectName : undefined);
  const nextStep = phases.find((phase) => phase.steps.some((step) => !step.completed))
    ?.steps.find((step) => !step.completed);

  const getMascotMessage = () => {
    if (!level) return "안녕! 나는 파일럿이야 🥚 레벨을 선택해줘!";
    if (!started) return "좋아! 프로젝트 정보를 입력해줘!";
    if (percentage === 0) return "알에서 깨어나려면 첫 단계를 체크해봐! 💪";
    if (percentage < 25) return "삐약! 태어났어! 계속 가보자~ 🐣";
    if (percentage < 50) return "날개가 자라고 있어! 대단해! 🐥";
    if (percentage < 75) return "이제 꽤 큰 닭이 됐어! 계속! 🐔";
    if (percentage < 100) return "독수리처럼 날아오를 준비! 거의 다 왔어! 🦅";
    return "전설이 됐어! 프로젝트 완성! 🏆🎊";
  };

  return (
    <>
      <Header
        onLogoClick={handleNewProject}
        onLoginClick={() => setShowLogin(true)}
        isLoggedIn={isLoggedIn}
        displayName={displayName}
        onLogout={handleLogout}
        onMyPage={isLoggedIn ? () => setPageView("mypage") : undefined}
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <main className="flex-1 px-4 py-6">
        {pageView === "mypage" && (
          <MyPage
          onBack={async () => {
              if (!started) {
               const projects = await getAllProjects();
                if (projects.length > 0) {
                  loadProject(projects[projects.length - 1]);
                }
              }
              setPageView("home");
            }}
            onSelectProject={loadProject}
          />
        )}

        {pageView === "home" && (
          <>
            <section className={`text-center ${started ? "mb-4" : "mb-10"}`}>
              <Mascot message={getMascotMessage()} size={started ? "sm" : "lg"} percentage={percentage} />
              {!level && (
                <div className="mt-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    바이브 코딩, 체계적으로 관리하자!
                  </h2>
                  <p className="text-gray-500 mb-4">
                    기획부터 배포까지, AI와 함께하는 프로젝트 여정
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm">
                    <span>👇</span>
                    <span>아래에서 레벨을 선택하면 바로 시작돼요!</span>
                  </div>
                </div>
              )}
            </section>

            {!started && (
              <section className="mb-10">
                {!level && (
                  <>
                    <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">
                      나의 바이브 코딩 레벨은?
                    </h3>
                    <LevelSelector onSelect={handleLevelSelect} selectedLevel={level ?? undefined} />
                  </>
                )}

                {level && !started && (
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">
                          {level === "beginner" && "🌱"}
                          {level === "intermediate" && "🌿"}
                          {level === "advanced" && "🌳"}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {LEVEL_CONFIG[level].label} 선택됨
                        </span>
                        <button
                          onClick={() => {
                            setLevel(null);
                            setPhases([]);
                          }}
                          className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                        >
                          변경
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">프로젝트 이름</label>
                          <input
                            type="text"
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            placeholder="예: 나만의 Todo 앱"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">🎯 목표</label>
                          <input
                            type="text"
                            value={goal}
                            onChange={(event) => setGoal(event.target.value)}
                            placeholder="예: 3시간 안에 MVP 완성하기!"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">📅 시작일</label>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(event) => setStartDate(event.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">🏁 마감일</label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(event) => setEndDate(event.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleStart}
                      disabled={!projectName.trim() || !startDate || !endDate}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      🚀 여정 시작하기!
                    </button>
                  </div>
                )}
              </section>
            )}

            {started && (
              <section className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                  <div className="flex items-center gap-4">
                    <ProgressRing percentage={percentage} size={64} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-800 truncate">{projectName}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {LEVEL_CONFIG[level!].label}
                        </span>
                        <span className="text-xs text-gray-400">{completedSteps}/{totalSteps}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold ml-auto"
                          suppressHydrationWarning
                        >
                          D{(() => {
                            const diff = Math.ceil(
                              (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            );
                            return diff >= 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                          })()}
                        </span>
                      </div>
                      {goal && <p className="text-xs text-purple-600 mt-0.5">🎯 {goal}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {percentage === 100
                          ? "🎉 모든 단계를 완료했어요!"
                          : completedSteps === 0
                            ? "✨ 첫 단계를 체크해서 시작해보세요!"
                            : `다음: ${nextStep?.title ?? ""}`}
                      </p>
                    </div>
                    <button
                      onClick={handleNewProject}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      + 새 프로젝트
                    </button>
                  </div>
                </div>

                <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setDashboardTab("overview")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      dashboardTab === "overview"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    📊 개요 & 추천
                  </button>
                  <button
                    onClick={() => setDashboardTab("timeline")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      dashboardTab === "timeline"
                        ? "bg-white text-gray-800 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    📋 단계별 체크리스트
                  </button>
                </div>

                {dashboardTab === "overview" && (
                  <div className="space-y-4">
                    <AICoachPanel
                      currentPhase={currentPhaseName}
                      level={level!}
                      completedSteps={completedSteps}
                      totalSteps={totalSteps}
                      projectName={projectName}
                      goal={goal}
                      phases={phases}
                      repoUrl={inferredRepoUrl}
                      repository={repositoryAccess?.repo ?? null}
                      githubToken={repositoryAccess?.token}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TodayRecommend phases={phases} level={level!} startDate={startDate} endDate={endDate} />
                      <ProgressInsight phases={phases} startDate={startDate} endDate={endDate} />
                    </div>
                    <RepoAnalyzer onRepositoryAccessChange={setRepositoryAccess} />
                  </div>
                )}

                {dashboardTab === "timeline" && (
                  <PhaseTimeline
                    phases={phases}
                    onToggleStep={handleToggleStep}
                    startDate={startDate}
                    endDate={endDate}
                  />
                )}
              </section>
            )}

            {started && (
              <AIChat
                currentPhase={currentPhaseName}
                level={level!}
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                projectName={projectName}
                goal={goal}
                phases={phases}
                repoUrl={inferredRepoUrl}
                repository={repositoryAccess?.repo ?? null}
                githubToken={repositoryAccess?.token}
              />
            )}
          </>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        VibePilot © 2026 — 바이브 코딩을 더 스마트하게 🐥
      </footer>
    </>
  );
}
