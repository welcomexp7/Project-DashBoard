"use client";

// ============================================================
// 대시보드 페이지 (메인)
// Aceternity UI 스타일 — 도트 그리드 배경 + 그라디언트 텍스트
// ============================================================

import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/src/store/useProjectStore";
import DashboardGrid from "@/src/components/dashboard/DashboardGrid";
import { KANBAN_STAGES } from "@/src/constants/kanban";
import { Loader2 } from "lucide-react";
import { useSSE } from "@/src/hooks/useSSE";

export default function DashboardPage() {
  const { dashboard, isLoading, error, fetchDashboard } = useProjectStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // SSE 구독 — todo.md 변경 시 대시보드 자동 갱신
  const handleTodoChanged = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);
  useSSE({ onTodoChanged: handleTodoChanged });

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

        {/* 프로젝트 그리드 */}
        <DashboardGrid projects={dashboard.projects} />
      </div>

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
