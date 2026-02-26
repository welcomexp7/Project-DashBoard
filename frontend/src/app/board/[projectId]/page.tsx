"use client";

// ============================================================
// 칸반 보드 페이지
// 헤더: 대시보드 링크 | 프로젝트 드롭다운 | (우측) 멀티셀렉 컨트롤
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, CheckSquare, X, Bot, Trash2 } from "lucide-react";
import { useProjectStore } from "@/src/store/useProjectStore";
import { useKanbanStore } from "@/src/store/useKanbanStore";
import KanbanBoard from "@/src/components/kanban/KanbanBoard";
import { cn } from "@/src/lib/utils";
import type { TicketResponse } from "@/src/types";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { projects, fetchProjects } = useProjectStore();
  const { tickets } = useKanbanStore();
  const currentProject = projects.find((p) => p.project_id === projectId);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 멀티셀렉 상태 (페이지 레벨에서 관리)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(
    new Set()
  );

  // 멀티셀렉 모달 요청 (KanbanBoard로 전달)
  const [multiDetailRequest, setMultiDetailRequest] = useState<
    TicketResponse[] | null
  >(null);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [projects.length, fetchProjects]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProjectSwitch = useCallback(
    (newProjectId: string) => {
      setIsDropdownOpen(false);
      setIsMultiSelectMode(false);
      setSelectedTicketIds(new Set());
      router.push(`/board/${newProjectId}`);
    },
    [router]
  );

  const handleToggleMultiSelect = useCallback(() => {
    if (isMultiSelectMode) {
      setIsMultiSelectMode(false);
      setSelectedTicketIds(new Set());
    } else {
      setIsMultiSelectMode(true);
    }
  }, [isMultiSelectMode]);

  const handleExitMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedTicketIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((ticketId: string) => {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  }, []);

  // 멀티셀렉 에이전트 실행 모달 열기
  const handleOpenMultiAgent = useCallback(() => {
    const selected = tickets.filter((t) => selectedTicketIds.has(t.ticket_id));
    if (selected.length > 0) setMultiDetailRequest(selected);
  }, [tickets, selectedTicketIds]);

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="bg-dot-pattern bg-grid-fade pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        {/* 상단 헤더 */}
        <div className="flex items-center gap-4 border-b border-white/[0.05] px-6 py-4">
          {/* 좌측: 대시보드 링크 + 프로젝트 드롭다운 */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드
          </Link>

          <div className="h-4 w-px bg-white/[0.1]" />

          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/[0.05]"
            >
              {currentProject?.color && (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: currentProject.color,
                    boxShadow: `0 0 8px ${currentProject.color}40`,
                  }}
                />
              )}
              <span className="font-mono text-sm text-muted">{projectId}</span>
              <span className="mx-1.5 text-white/[0.15]">|</span>
              <h1 className="text-lg font-semibold">
                {currentProject?.name ?? projectId}
              </h1>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted transition-transform",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-white/[0.08] bg-slate-900/90 py-2 shadow-xl backdrop-blur-2xl">
                <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-muted">
                  프로젝트 전환
                </p>
                {projects.map((p) => (
                  <button
                    key={p.project_id}
                    onClick={() => handleProjectSwitch(p.project_id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.05]",
                      p.project_id === projectId &&
                        "bg-white/[0.05] font-medium"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: p.color,
                        boxShadow: `0 0 6px ${p.color}40`,
                      }}
                    />
                    <span className="shrink-0 font-mono text-[11px] text-muted">{p.project_id}</span>
                    <span className="text-white/[0.1]">|</span>
                    <span className="flex-1 truncate text-left">{p.name}</span>
                    {p.project_id === projectId && (
                      <span className="text-[10px] text-accent">현재</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 우측: 멀티셀렉 컨트롤 */}
          <div className="ml-auto flex items-center gap-3">
            {isMultiSelectMode && selectedTicketIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedTicketIds.size}개 선택
                </span>
                <button
                  onClick={handleOpenMultiAgent}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-colors hover:bg-accent-hover"
                >
                  <Bot className="h-3.5 w-3.5" />
                  에이전트 실행
                </button>
                <button
                  onClick={handleOpenMultiAgent}
                  className="flex items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
                  title="선택된 티켓 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
                <button
                  onClick={handleExitMultiSelect}
                  className="rounded-lg p-1 text-muted transition-colors hover:text-foreground"
                  title="선택 해제"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={handleToggleMultiSelect}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                isMultiSelectMode
                  ? "border border-accent/30 bg-accent/10 text-accent"
                  : "border border-white/[0.05] text-muted hover:border-white/[0.1] hover:text-foreground"
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {isMultiSelectMode ? "멀티셀렉 ON" : "멀티셀렉"}
            </button>
          </div>
        </div>

        {/* 칸반 보드 */}
        <KanbanBoard
          projectId={projectId}
          isMultiSelectMode={isMultiSelectMode}
          selectedTicketIds={selectedTicketIds}
          onToggleSelect={handleToggleSelect}
          onExitMultiSelect={handleExitMultiSelect}
          multiDetailRequest={multiDetailRequest}
          onMultiDetailHandled={() => setMultiDetailRequest(null)}
        />
      </div>
    </div>
  );
}
