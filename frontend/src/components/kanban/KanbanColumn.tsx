"use client";

// ============================================================
// 칸반 컬럼 컴포넌트
// Aceternity UI: Glassmorphism + 드롭 글로우
// ============================================================

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import type { TicketResponse } from "@/src/types";
import type { StageConfig } from "@/src/constants/kanban";
import { cn } from "@/src/lib/utils";
import TicketCard from "./TicketCard";

interface KanbanColumnProps {
  stage: StageConfig;
  tickets: TicketResponse[];
  onOpenDetail: (ticket: TicketResponse) => void;
  /** 멀티셀렉 선택된 티켓 ID Set */
  selectedTicketIds?: Set<string>;
  /** 티켓 선택/해제 콜백 */
  onToggleSelect?: (ticketId: string) => void;
  /** 멀티드래그 중인 티켓 ID Set (고스트 표시용) */
  draggedTicketIds?: Set<string>;
  /** 티켓 추가 버튼 클릭 콜백 (Plan 칼럼만) */
  onAddTicket?: () => void;
}

export default function KanbanColumn({
  stage,
  tickets,
  onOpenDetail,
  selectedTicketIds,
  onToggleSelect,
  draggedTicketIds,
  onAddTicket,
}: KanbanColumnProps) {
  // 에픽 그룹 정렬: 에픽 바로 아래에 자식 배치
  const orderedTickets = useMemo(() => {
    const epicChildIds = new Set(tickets.flatMap((t) => t.children_ids));
    const result: TicketResponse[] = [];
    for (const ticket of tickets) {
      if (epicChildIds.has(ticket.ticket_id)) continue; // 자식은 에픽에서 삽입
      result.push(ticket);
      if (ticket.ticket_type === "epic") {
        const children = tickets.filter((t) =>
          ticket.children_ids.includes(t.ticket_id)
        );
        result.push(...children);
      }
    }
    return result;
  }, [tickets]);

  const { isOver, setNodeRef } = useDroppable({
    id: stage.key,
    data: {
      type: "column",
      stage: stage.key,
    },
  });

  return (
    <div
      className={cn(
        "flex h-full min-w-[280px] flex-col rounded-xl border border-white/[0.05] bg-slate-900/40 backdrop-blur-md",
        "transition-all duration-200",
        isOver &&
          "border-accent/30 bg-accent/[0.03] shadow-[0_0_30px_rgba(59,130,246,0.1)]"
      )}
    >
      {/* 컬럼 헤더 — 하단 스테이지 컬러 라인 */}
      <div className="relative flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
        <span
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: stage.color,
            boxShadow: `0 0 8px ${stage.color}40`,
          }}
        />
        <h3 className="text-sm font-semibold" style={{ color: stage.color }}>
          {stage.label}
        </h3>
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.05] px-1.5 text-xs font-medium text-muted">
          {tickets.length}
        </span>
        {onAddTicket && (
          <button
            onClick={onAddTicket}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground"
            title="새 티켓 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        {/* 하단 그라디언트 라인 */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${stage.color}40, transparent)`,
          }}
        />
      </div>

      {/* 티켓 리스트 */}
      <div
        ref={setNodeRef}
        className="kanban-column-scroll flex-1 overflow-y-auto p-3"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        <SortableContext
          items={orderedTickets.map((t) => t.ticket_id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {orderedTickets.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className={ticket.ticket_type === "child" ? "mt-1" : "mt-2 first:mt-0"}
              >
                <TicketCard
                  ticket={ticket}
                  onOpenDetail={onOpenDetail}
                  isSelected={selectedTicketIds?.has(ticket.ticket_id)}
                  onToggleSelect={onToggleSelect}
                  isGhost={draggedTicketIds?.has(ticket.ticket_id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* 빈 컬럼 플레이스홀더 */}
        {tickets.length === 0 && (
          <div className="flex h-20 animate-pulse items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-xs text-muted">
            티켓을 여기에 드롭
          </div>
        )}
      </div>
    </div>
  );
}
