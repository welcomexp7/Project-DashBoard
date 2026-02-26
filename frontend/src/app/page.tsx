"use client";

// ============================================================
// 대시보드 페이지 (메인)
// Aceternity UI 스타일 — 도트 그리드 배경 + 그라디언트 텍스트
// ============================================================

import { useEffect, useCallback, useState, useRef } from "react";
import { useProjectStore } from "@/src/store/useProjectStore";
import DashboardGrid from "@/src/components/dashboard/DashboardGrid";
import ProjectNoteModal from "@/src/components/notes/ProjectNoteModal";
import { KANBAN_STAGES } from "@/src/constants/kanban";
import { Loader2, FileText, ChevronDown } from "lucide-react";
import { useSSE } from "@/src/hooks/useSSE";
import { cn } from "@/src/lib/utils";

export default function DashboardPage() {
  const { dashboard, isLoading, error, fetchDashboard } = useProjectStore();

  // 프로젝트 노트 모달 상태
  const [noteProjectId, setNoteProjectId] = useState<string | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // SSE 구독 — todo.md 변경 시 대시보드 자동 갱신
  const handleTodoChanged = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  useSSE({ onTodoChanged: handleTodoChanged });

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 로딩 상태
  if (isLoading && !dashboard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-6 py-4 text-sm text-danger">
          {error}
        </div>
        <button
          onClick={fetchDashboard}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted">
        <p>대시보드 데이터를 불러오는 중...</p>
      </div>
    );
  }

  const totalDone =
    (dashboard.total_by_stage["완료"] ?? 0) +
    (dashboard.total_by_stage["QA Done"] ?? 0) +
    (dashboard.total_by_stage["배포"] ?? 0);
  const overallProgress =
    dashboard.total_tickets > 0
      ? Math.round((totalDone / dashboard.total_tickets) * 100)
      : 0;

  return (
    <div className="relative px-6 py-8">
      {/* Aceternity 도트 그리드 배경 */}
      <div className="bg-dot-pattern bg-grid-fade pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        {/* 헤더 — 그라디언트 텍스트 */}
        <div className="mb-8">
          <h1 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-2xl font-bold text-transparent">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-muted">
            전체 프로젝트 현황을 한눈에 확인합니다
          </p>
        </div>

        {/* 요약 통계 카드 — Glassmorphism + Spotlight */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="프로젝트" value={dashboard.total_projects} />
          <StatCard label="총 티켓" value={dashboard.total_tickets} />
          <StatCard
            label="전체 완료율"
            value={overallProgress}
            suffix="%"
            gradient
          />

          {/* 스테이지별 현황 */}
          <div className="card-spotlight rounded-xl border border-white/[0.05] bg-white/[0.03] p-5 backdrop-blur-md">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              스테이지별
            </p>
            <div className="flex flex-wrap gap-1.5">
              {KANBAN_STAGES.map(({ key, label, color }) => (
                <span
                  key={key}
                  className="text-xs font-medium"
                  style={{ color }}
                >
                  {label}: {dashboard.total_by_stage[key] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 프로젝트 디테일 툴바 */}
        <div className="mb-6 flex items-center gap-3">
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm transition-colors hover:border-white/[0.15]"
            >
              {selectedProjectId ? (
                <>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        dashboard.projects.find(
                          (p) => p.project_id === selectedProjectId
                        )?.color ?? "#6366f1",
                      boxShadow: `0 0 6px ${
                        dashboard.projects.find(
                          (p) => p.project_id === selectedProjectId
                        )?.color ?? "#6366f1"
                      }40`,
                    }}
                  />
                  <span className="text-foreground">
                    {dashboard.projects.find(
                      (p) => p.project_id === selectedProjectId
                    )?.name ?? selectedProjectId}
                  </span>
                </>
              ) : (
                <span className="text-muted">프로젝트 선택</span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted transition-transform",
                  isProjectDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-white/[0.08] bg-slate-900/95 py-1.5 shadow-xl backdrop-blur-2xl">
                {dashboard.projects.map((p) => (
                  <button
                    key={p.project_id}
                    onClick={() => {
                      setSelectedProjectId(p.project_id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05]",
                      p.project_id === selectedProjectId &&
                        "bg-white/[0.05] font-medium"
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: p.color,
                        boxShadow: `0 0 6px ${p.color}40`,
                      }}
                    />
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {p.project_id}
                    </span>
                    <span className="text-white/[0.1]">|</span>
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    {p.project_id === selectedProjectId && (
                      <span className="text-[10px] text-accent">선택됨</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (selectedProjectId) setNoteProjectId(selectedProjectId);
            }}
            disabled={!selectedProjectId}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText className="h-4 w-4" />
            프로젝트 디테일
          </button>
        </div>

        {/* 프로젝트 그리드 */}
        <DashboardGrid projects={dashboard.projects} />
      </div>

      {/* 프로젝트 노트 모달 — isLoading 바깥 배치 (MEMORY.md 패턴) */}
      {noteProjectId && (
        <ProjectNoteModal
          projectId={noteProjectId}
          projectName={
            dashboard.projects.find((p) => p.project_id === noteProjectId)
              ?.name ?? noteProjectId
          }
          projectColor={
            dashboard.projects.find((p) => p.project_id === noteProjectId)
              ?.color ?? "#6366f1"
          }
          onClose={() => setNoteProjectId(null)}
        />
      )}
    </div>
  );
}

/** 통계 카드 — Spotlight 효과 내장 */
function StatCard({
  label,
  value,
  suffix,
  gradient,
}: {
  label: string;
  value: number;
  suffix?: string;
  gradient?: boolean;
}) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--spotlight-x",
      `${e.clientX - rect.left}px`
    );
    e.currentTarget.style.setProperty(
      "--spotlight-y",
      `${e.clientY - rect.top}px`
    );
  };

  return (
    <div
      className="card-spotlight rounded-xl border border-white/[0.05] bg-white/[0.03] p-5 backdrop-blur-md"
      onMouseMove={handleMouseMove}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${
          gradient
            ? "bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent"
            : ""
        }`}
      >
        {value}
        {suffix && <span className="text-lg text-muted">{suffix}</span>}
      </p>
    </div>
  );
}
