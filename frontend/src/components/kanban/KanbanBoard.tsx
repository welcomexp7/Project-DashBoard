"use client";

// ============================================================
// 칸반 보드 최상위 컨테이너
// @dnd-kit DndContext로 드래그앤드롭 관리
// 멀티셀렉 상태는 부모(Board 페이지)에서 주입
// ============================================================

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { TicketResponse, KanbanStage, AgentMode } from "@/src/types";
import { KANBAN_STAGES } from "@/src/constants/kanban";
import { useKanbanStore } from "@/src/store/useKanbanStore";
import { useProjectStore } from "@/src/store/useProjectStore";
import { buildAgentPrompt } from "@/src/lib/buildAgentPrompt";
import { filterTickets } from "@/src/lib/filterTickets";
import KanbanColumn from "./KanbanColumn";
import TicketFilterBar from "./TicketFilterBar";
import CreateTicketModal from "./CreateTicketModal";
import TicketCard from "./TicketCard";
import TicketDetailModal from "./TicketDetailModal";
import AgentLogPanel from "@/src/components/agent/AgentLogPanel";
import { useSSE } from "@/src/hooks/useSSE";

interface KanbanBoardProps {
  projectId: string;
  /** 멀티셀렉 모드 여부 (부모에서 관리) */
  isMultiSelectMode: boolean;
  selectedTicketIds: Set<string>;
  onToggleSelect: (ticketId: string) => void;
  onExitMultiSelect: () => void;
  /** 멀티셀렉 에이전트 실행 모달 요청 (부모에서 트리거) */
  multiDetailRequest: TicketResponse[] | null;
  onMultiDetailHandled: () => void;
}

export default function KanbanBoard({
  projectId,
  isMultiSelectMode,
  selectedTicketIds,
  onToggleSelect,
  onExitMultiSelect,
  multiDetailRequest,
  onMultiDetailHandled,
}: KanbanBoardProps) {
  const {
    isLoading, error, fetchTickets,
    moveTicket, moveTickets, deleteTicket, deleteTickets, createTicket, createChildTicket, tickets,
    searchQuery, filterCategories, filterTypes,
  } = useKanbanStore();
  const { projects } = useProjectStore();

  const currentProject = projects.find((p) => p.project_id === projectId);

  // 필터링된 byStage (원본 tickets/byStage는 DnD용으로 보존)
  const filteredByStage = useMemo(() => {
    const filtered = filterTickets(tickets, { searchQuery, filterCategories, filterTypes });
    return KANBAN_STAGES.map(({ key }) => ({
      stage: key,
      tickets: filtered.filter((t) => t.stage === key),
    }));
  }, [tickets, searchQuery, filterCategories, filterTypes]);

  const [activeTicket, setActiveTicket] = useState<TicketResponse | null>(null);

  // 멀티드래그: 현재 드래그 중인 티켓 ID 집합
  const [draggedTicketIds, setDraggedTicketIds] = useState<Set<string>>(new Set());

  // 티켓 상세/멀티 모달
  const [detailTickets, setDetailTickets] = useState<TicketResponse[]>([]);

  // 티켓 생성 모달
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 에이전트 패널
  const [agentConfig, setAgentConfig] = useState<{
    tickets: TicketResponse[];
    prompt: string;
    mode: AgentMode;
  } | null>(null);

  // "진행중" 이동 시 에이전트 호출 확인 모달 (단일/복수 통합)
  const [pendingMove, setPendingMove] = useState<{
    tickets: TicketResponse[];
    newStage: KanbanStage;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTickets(projectId);
  }, [projectId, fetchTickets]);

  // 부모에서 멀티셀렉 에이전트 실행 요청이 오면 모달 열기
  useEffect(() => {
    if (multiDetailRequest && multiDetailRequest.length > 0) {
      setDetailTickets(multiDetailRequest);
      onMultiDetailHandled();
    }
  }, [multiDetailRequest, onMultiDetailHandled]);

  const handleTodoChanged = useCallback(
    (changedProjectId: string) => {
      if (changedProjectId === projectId) fetchTickets(projectId);
    },
    [projectId, fetchTickets]
  );
  useSSE({ onTodoChanged: handleTodoChanged });

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const ticketId = event.active.id as string;
      const ticket = tickets.find((t) => t.ticket_id === ticketId);
      if (!ticket) return;
      setActiveTicket(ticket);

      // 멀티셀렉 모드에서 선택된 카드를 드래그하면 → 전체 선택 함께 이동
      if (isMultiSelectMode && selectedTicketIds.has(ticketId)) {
        setDraggedTicketIds(new Set(selectedTicketIds));
      } else {
        // 에픽 드래그 시 자식 자동 포함
        const ids = new Set([ticketId]);
        if (ticket.ticket_type === "epic" && ticket.children_ids.length > 0) {
          ticket.children_ids.forEach((id) => ids.add(id));
        }
        setDraggedTicketIds(ids);
      }
    },
    [tickets, isMultiSelectMode, selectedTicketIds]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const currentDraggedIds = draggedTicketIds;
      setActiveTicket(null);
      setDraggedTicketIds(new Set());

      const { over } = event;
      if (!over) return;

      // 드롭 대상 스테이지 결정
      let newStage: KanbanStage | null = null;

      if (over.data.current?.type === "column") {
        newStage = over.data.current.stage as KanbanStage;
      } else if (over.data.current?.type === "ticket") {
        const overTicket = over.data.current.ticket as TicketResponse;
        newStage = overTicket.stage;
      } else {
        const stageMatch = KANBAN_STAGES.find((s) => s.key === over.id);
        if (stageMatch) newStage = stageMatch.key;
      }

      if (!newStage) return;

      // 이동 대상 티켓 필터 (같은 스테이지 제외)
      const ticketsToMove = tickets.filter(
        (t) => currentDraggedIds.has(t.ticket_id) && t.stage !== newStage
      );
      if (ticketsToMove.length === 0) return;

      // "진행중" 이동 시 확인 모달
      if (newStage === "진행중") {
        setPendingMove({ tickets: ticketsToMove, newStage });
        return;
      }

      // 단일/복수 모두 moveTickets로 처리
      moveTickets(
        ticketsToMove.map((t) => t.ticket_id),
        newStage
      );
    },
    [tickets, moveTickets, draggedTicketIds]
  );

  const handleConfirmMove = useCallback(
    (withAgent: boolean) => {
      if (!pendingMove) return;
      moveTickets(
        pendingMove.tickets.map((t) => t.ticket_id),
        pendingMove.newStage
      );

      if (withAgent && currentProject) {
        const agentMode: AgentMode = "interactive";
        const prompt = buildAgentPrompt(pendingMove.tickets, undefined, agentMode);
        setAgentConfig({
          tickets: pendingMove.tickets,
          prompt,
          mode: agentMode,
        });
      }
      setPendingMove(null);
    },
    [pendingMove, moveTickets, currentProject]
  );

  const handleStageChange = useCallback(
    (ticketId: string, newStage: KanbanStage) => {
      moveTicket(ticketId, newStage);
      setDetailTickets([]);
    },
    [moveTicket]
  );

  const handleInvokeAgent = useCallback(
    (agentTickets: TicketResponse[], additionalPrompt?: string, mode: AgentMode = "interactive") => {
      if (!currentProject) return;
      const prompt = buildAgentPrompt(agentTickets, additionalPrompt, mode);
      setAgentConfig({ tickets: agentTickets, prompt, mode });
      setDetailTickets([]);
      onExitMultiSelect();
    },
    [currentProject, onExitMultiSelect]
  );

  const handleDeleteTicket = useCallback(
    (ticketId: string, cascade?: boolean) => {
      deleteTicket(ticketId, cascade);
    },
    [deleteTicket]
  );

  const handleDeleteTickets = useCallback(
    (ticketIds: string[]) => {
      deleteTickets(ticketIds);
    },
    [deleteTickets]
  );

  const handleAgentComplete = useCallback(() => {
    fetchTickets(projectId);
  }, [projectId, fetchTickets]);

  // 에이전트 시작 성공 시 → 대상 티켓들을 "진행중"으로 자동 이동
  // moveTicket은 낙관적 업데이트 (isLoading 미사용) → 언마운트 루프 없음 (안전)
  const handleAgentStarted = useCallback(() => {
    if (!agentConfig) return;
    agentConfig.tickets.forEach((t) => {
      if (t.stage === "계획") moveTicket(t.ticket_id, "진행중");
    });
  }, [agentConfig, moveTicket]);

  // ── 메인 렌더링 ──
  // 핵심: AgentLogPanel, 모달들은 isLoading과 독립적으로 렌더링.
  // early return을 사용하면 isLoading 시 AgentLogPanel이 언마운트되어
  // guard ref가 초기화 → 무한 CLI 실행 루프 발생 (Phase 6.2 방어 1).
  return (
    <>
      {/* 필터 바: isLoading과 독립 (MEMORY.md 원칙: early return 밖에 배치) */}
      <TicketFilterBar />

      {/* 보드 영역: isLoading/error 조건부 렌더링 */}
      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-6 py-4 text-sm text-danger">
            {error}
          </div>
          <button
            onClick={() => fetchTickets(projectId)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto px-6 py-4">
            {KANBAN_STAGES.map((stage) => {
              const stageTickets =
                filteredByStage.find((bs) => bs.stage === stage.key)?.tickets ?? [];
              return (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  tickets={stageTickets}
                  onOpenDetail={(ticket) => setDetailTickets([ticket])}
                  selectedTicketIds={
                    isMultiSelectMode ? selectedTicketIds : undefined
                  }
                  onToggleSelect={
                    isMultiSelectMode ? onToggleSelect : undefined
                  }
                  draggedTicketIds={
                    draggedTicketIds.size > 1 ? draggedTicketIds : undefined
                  }
                  onAddTicket={
                    stage.key === "계획"
                      ? () => setIsCreateModalOpen(true)
                      : undefined
                  }
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTicket ? (
              <div className="relative">
                {/* 멀티드래그: 뒤에 깔리는 스택 카드 */}
                {draggedTicketIds.size > 2 && (
                  <div className="absolute -top-2 left-1 right-1 h-full rounded-lg border border-white/[0.05] bg-slate-800/80" />
                )}
                {draggedTicketIds.size > 1 && (
                  <div className="absolute -top-1 left-0.5 right-0.5 h-full rounded-lg border border-white/[0.05] bg-slate-800/90" />
                )}
                {/* 메인 카드 */}
                <TicketCard
                  ticket={activeTicket}
                  onOpenDetail={() => {}}
                  isOverlay
                />
                {/* 멀티드래그 카운트 배지 */}
                {draggedTicketIds.size > 1 && (
                  <div className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                    {draggedTicketIds.size}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── 아래 요소들은 isLoading과 독립: 언마운트 없음 ── */}

      {/* 티켓 생성 모달 */}
      {isCreateModalOpen && (
        <CreateTicketModal
          sections={currentProject?.sections ?? []}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(sectionName, title) => {
            createTicket(sectionName, title);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* 티켓 상세/멀티 모달 */}
      {detailTickets.length > 0 && (
        <TicketDetailModal
          tickets={detailTickets}
          allTickets={tickets}
          onClose={() => setDetailTickets([])}
          onStageChange={handleStageChange}
          onInvokeAgent={handleInvokeAgent}
          onDeleteTicket={handleDeleteTicket}
          onDeleteTickets={handleDeleteTickets}
          onCreateChildTicket={createChildTicket}
        />
      )}

      {/* "진행중" 이동 확인 모달 */}
      <AnimatePresence>
        {pendingMove && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="modal-gradient-line relative w-full max-w-sm rounded-xl border border-white/[0.08] bg-slate-900/80 p-6 shadow-2xl backdrop-blur-2xl">
              <h3 className="mb-2 text-base font-semibold">
                에이전트 실행 확인
              </h3>
              <p className="mb-3 text-sm text-muted">
                {pendingMove.tickets.length === 1
                  ? `"${pendingMove.tickets[0].title}"을(를) 진행중으로 이동합니다.`
                  : `${pendingMove.tickets.length}개 티켓을 진행중으로 이동합니다.`}
                {" "}에이전트를 함께 실행할까요?
              </p>
              {/* 복수 티켓일 때 목록 표시 */}
              {pendingMove.tickets.length > 1 && (
                <ul className="mb-4 max-h-32 overflow-y-auto space-y-1 rounded-lg bg-white/[0.03] p-3 text-xs text-muted">
                  {pendingMove.tickets.map((t) => (
                    <li key={t.ticket_id}>• {t.title}</li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleConfirmMove(false)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                >
                  이동만
                </button>
                <button
                  onClick={() => handleConfirmMove(true)}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-colors hover:bg-accent-hover"
                >
                  에이전트 실행
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 에이전트 로그 패널 */}
      <AnimatePresence>
        {agentConfig && currentProject && (
          <AgentLogPanel
            projectId={projectId}
            projectPath={currentProject.path}
            prompt={agentConfig.prompt}
            mode={agentConfig.mode}
            onClose={() => setAgentConfig(null)}
            onComplete={handleAgentComplete}
            onStarted={handleAgentStarted}
          />
        )}
      </AnimatePresence>
    </>
  );
}
