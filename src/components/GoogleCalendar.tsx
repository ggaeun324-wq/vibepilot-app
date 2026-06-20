"use client";

import { Phase } from "@/types/project";

interface GoogleCalendarProps {
  projectName: string;
  phases: Phase[];
  startDate: string;
  endDate: string;
}

export default function GoogleCalendar({ projectName, phases, startDate, endDate, embedded = false }: GoogleCalendarProps & { embedded?: boolean }) {
  const generateCalendarUrl = (title: string, start: string, end: string, description: string) => {
    const startFormatted = start.replace(/-/g, "");
    // Google Calendar end date is exclusive, so add 1 day
    const endDate_ = new Date(end);
    endDate_.setDate(endDate_.getDate() + 1);
    const endFormatted = endDate_.toISOString().split("T")[0].replace(/-/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${startFormatted}/${endFormatted}`,
      details: description,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Calculate date ranges proportionally by step count
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalSteps = phases.reduce((acc, p) => acc + p.steps.length, 0);

  // Distribute days proportionally, ensuring each phase gets at least 1 day
  const rawDays = phases.map((p) => (p.steps.length / totalSteps) * totalDays);
  const phaseDays = rawDays.map((d) => Math.max(1, Math.round(d)));

  // Adjust to match total
  let daySum = phaseDays.reduce((a, b) => a + b, 0);
  while (daySum > totalDays) {
    const maxIdx = phaseDays.indexOf(Math.max(...phaseDays));
    phaseDays[maxIdx]--;
    daySum--;
  }
  while (daySum < totalDays) {
    const minIdx = phaseDays.indexOf(Math.min(...phaseDays));
    phaseDays[minIdx]++;
    daySum++;
  }

  // Build schedule with cumulative dates
  const currentDate = new Date(start);
  const phaseSchedules = phases.map((phase, idx) => {
    const phaseStart = new Date(currentDate);
    const days = phaseDays[idx];
    currentDate.setDate(currentDate.getDate() + days);
    const phaseEnd = new Date(currentDate);
    // End date is the last day of the phase (not the next day)
    const displayEnd = new Date(phaseEnd);
    displayEnd.setDate(displayEnd.getDate() - 1);

    const completed = phase.steps.filter((s) => s.completed).length;
    const total = phase.steps.length;

    return {
      phase,
      startStr: phaseStart.toISOString().split("T")[0],
      endStr: displayEnd.toISOString().split("T")[0],
      calendarEndStr: phaseEnd.toISOString().split("T")[0],
      days,
      completed,
      total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const addAllToCalendar = () => {
    const url = generateCalendarUrl(
      `🐥 ${projectName} - 바이브 코딩`,
      startDate,
      endDate,
      `VibePilot 프로젝트\n단계: ${phases.map((p) => p.name).join(" → ")}\n총 ${totalSteps}개 태스크`
    );
    window.open(url, "_blank");
  };

  const addPhaseToCalendar = (schedule: typeof phaseSchedules[0]) => {
    const steps = schedule.phase.steps.map((s) => `${s.completed ? "✅" : "☐"} ${s.title}`).join("\n");
    const url = generateCalendarUrl(
      `${schedule.phase.emoji} ${projectName} - ${schedule.phase.name}`,
      schedule.startStr,
      schedule.calendarEndStr,
      `VibePilot 단계: ${schedule.phase.name}\n진행: ${schedule.completed}/${schedule.total}\n\n할 일:\n${steps}`
    );
    window.open(url, "_blank");
  };

  // Visual timeline bar colors
  const phaseColors = ["bg-blue-400", "bg-purple-400", "bg-amber-400", "bg-green-400", "bg-red-400", "bg-indigo-400", "bg-pink-400", "bg-teal-400", "bg-orange-400", "bg-cyan-400"];

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-800">📅 Google Calendar 연동</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {formatDate(startDate)} ~ {formatDate(endDate)} · 총 {totalDays}일 · {totalSteps}개 태스크
          </p>
        </div>
        <button
          onClick={addAllToCalendar}
          className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          📅 전체 추가
        </button>
      </div>

      {/* Visual Timeline Bar */}
      <div className="flex w-full h-3 rounded-full overflow-hidden mb-4 bg-gray-100">
        {phaseSchedules.map((schedule, idx) => (
          <div
            key={schedule.phase.id}
            className={`${phaseColors[idx % phaseColors.length]} transition-all relative group cursor-pointer`}
            style={{ width: `${(schedule.days / totalDays) * 100}%` }}
            title={`${schedule.phase.name}: ${formatDate(schedule.startStr)}~${formatDate(schedule.endStr)} (${schedule.days}일)`}
          >
            {schedule.progress > 0 && (
              <div className="absolute inset-0 bg-white/40" style={{ width: `${100 - schedule.progress}%`, right: 0, left: "auto" }} />
            )}
          </div>
        ))}
      </div>

      {/* Phase List */}
      <div className="space-y-1.5">
        {phaseSchedules.map((schedule, idx) => (
          <div
            key={schedule.phase.id}
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-blue-50 transition-colors group cursor-pointer"
            onClick={() => addPhaseToCalendar(schedule)}
          >
            {/* Color dot */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${phaseColors[idx % phaseColors.length]}`} />
            {/* Emoji */}
            <span className="text-base flex-shrink-0">{schedule.phase.emoji}</span>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 truncate">{schedule.phase.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {schedule.completed}/{schedule.total}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {formatDate(schedule.startStr)} ~ {formatDate(schedule.endStr)} · {schedule.days}일
              </p>
            </div>
            {/* Progress mini bar */}
            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
              <div
                className={`h-full rounded-full ${phaseColors[idx % phaseColors.length]}`}
                style={{ width: `${schedule.progress}%` }}
              />
            </div>
            {/* Add button */}
            <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              📅
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 mt-2 text-center">
        각 단계를 클릭하면 Google Calendar에 추가됩니다
      </p>
    </>
  );

  if (embedded) return <div>{content}</div>;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      {content}
    </div>
  );
}
