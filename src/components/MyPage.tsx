"use client";

import { useEffect, useState } from "react";

import { calculateProgress, deleteProject, getAllProjects, SavedProject } from "@/lib/storage";
import GoogleCalendar from "./GoogleCalendar";

interface MyPageProps {
  onBack: () => void | Promise<void>;
  onSelectProject: (project: SavedProject) => void;
}

export default function MyPage({ onBack, onSelectProject }: MyPageProps) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calendarEnabled, setCalendarEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const selectedProject = projects.find((p) => p.id === selectedId);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      const nextProjects = await getAllProjects();
      if (!active) {
        return;
      }

      setProjects(nextProjects);
      setLoading(false);
      setSelectedId((currentId) => currentId ?? nextProjects[0]?.id ?? null);
    };

    void loadProjects();

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("이 프로젝트를 삭제하시겠습니까?")) {
      await deleteProject(id);
      setProjects(await getAllProjects());
      if (selectedId === id) setSelectedId(null);
    }
  };

  const toggleCalendar = (id: string) => {
    setCalendarEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← 돌아가기
        </button>
        <h2 className="text-2xl font-bold text-gray-800">📋 마이페이지</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-700">내 프로젝트 ({projects.length})</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                불러오는 중...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                아직 프로젝트가 없어요
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {projects.map((proj) => {
                  const progress = calculateProgress(proj.phases).percentage;
                  const isSelected = selectedId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? "bg-amber-50 border-l-4 border-l-amber-400" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedId(proj.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-800 text-sm truncate">{proj.name}</h4>
                        <span className="text-xs font-bold text-amber-600">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {proj.startDate} ~ {proj.endDate}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {proj.level === "beginner" ? "초보" : proj.level === "intermediate" ? "중급" : "고급"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Project Detail + Calendar */}
        <div className="lg:col-span-2 space-y-4">
          {selectedProject ? (
            <>
              {/* Project Info */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{selectedProject.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectProject(selectedProject)}
                      className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      열기
                    </button>
                    <button
                      onClick={() => handleDelete(selectedProject.id)}
                      className="text-xs px-3 py-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {selectedProject.goal && (
                  <p className="text-sm text-purple-600 mb-2">🎯 {selectedProject.goal}</p>
                )}
                <div className="text-xs text-gray-400">
                  📅 {selectedProject.startDate} ~ {selectedProject.endDate}
                </div>
              </div>

              {/* Calendar Toggle */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">📅 Google Calendar 연동</h3>
                  <button
                    onClick={() => toggleCalendar(selectedProject.id)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      calendarEnabled[selectedProject.id] ? "bg-green-400" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        calendarEnabled[selectedProject.id] ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {calendarEnabled[selectedProject.id] ? (
                  <GoogleCalendar
                    projectName={selectedProject.name}
                    phases={selectedProject.phases}
                    startDate={selectedProject.startDate}
                    endDate={selectedProject.endDate}
                    embedded
                  />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    토글을 켜서 캘린더 연동을 활성화하세요
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-gray-500">왼쪽에서 프로젝트를 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
