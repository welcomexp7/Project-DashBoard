"use client";

// ============================================================
// 티켓 카드 컴포넌트
// Aceternity UI: 글로우 호버 + 네온 드래그 오버레이
// 멀티셀렉 체크박스 지원
// ============================================================

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Check } from "lucide-react";
import type { TicketResponse } from "@/src/types";
import { cn } from "@/src/lib/utils";
import Badge from "@/src/components/common/Badge";
import { getSectionCategory } from "@/src/constants/kanban";

interface TicketCardProps {
  ticket: TicketResponse;
  onOpenDetail: (ticket: TicketResponse) => void;
  isOverlay?: boolean;
  /** 멀티셀렉 선택 여부 */
  isSelected?: boolean;
  /** 선택/해제 토글 콜백 */
  onToggleSelect?: (ticketId: string) => void;
  /** 멀티드래그 중 함께 이동될 카드 (고스트 상태) */
  isGhost?: boolean;
}

export default function TicketCard({
  ticket,
  onOpenDetail,
  isOverlay = false,
  isSelected = false,
  onToggleSelect,
  isGhost = false,
}: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.ticket_id,
    data: {
      type: "ticket",
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.(ticket.ticket_id);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={!isOverlay ? { opacity: 0, y: 10 } : undefined}
      animate={!isOverlay ? { opacity: 1, y: 0 } : undefined}
      exit={!isOverlay ? { opacity: 0, y: -10 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        "ticket-glow group relative overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 backdrop-blur-sm",
        "hover:bg-white/[0.04]",
        isDragging && "opacity-40",
        isOverlay &&
          "rotate-2 border-accent/40 shadow-[0_0_40px_8px_rgba(59,130,246,0.15)]",
        isSelected &&
          "border-accent/50 bg-accent/[0.05] shadow-[0_0_20px_rgba(59,130,246,0.1)]",
        isGhost &&
          "opacity-30 scale-[0.97] pointer-events-none outline-2 outline-dashed outline-accent/20",
        ticket.ticket_type === "epic" && "border-l-[3px] border-l-accent",
        ticket.ticket_type === "child" && "ml-3 border-l-2 border-l-accent/20"
      )}
    >

      <div className="flex items-start gap-2">
        {/* 멀티셀렉 체크박스 */}
        {onToggleSelect && (
          <button
            onClick={handleSelectClick}
            className={cn(
              "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all",
              isSelected
                ? "border-accent bg-accent text-white"
                : "border-white/[0.15] text-transparent hover:border-white/[0.3]"
            )}
          >
            <Check className="h-3 w-3" />
          </button>
        )}

        {/* 드래그 핸들 */}
        <button
          className="mt-0.5 flex-shrink-0 cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 카드 콘텐츠 */}
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onOpenDetail(ticket)}
        >
          <p className="text-sm font-medium leading-snug text-foreground">
            {ticket.title}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {(() => {
              const cat = getSectionCategory(ticket.section.name);
              return (
                <Badge
                  color={cat.color}
                  bgColor={cat.bgColor}
                  className="border border-current/20 font-semibold"
                >
                  {cat.label}
                </Badge>
              );
            })()}
            <span className="truncate text-[10px] text-muted">
              {ticket.section.name}
            </span>
            {/* Epic 티켓: 하위 태스크 수 배지 */}
            {ticket.ticket_type === "epic" && ticket.children_ids.length > 0 && (
              <span className="text-[10px] font-medium text-accent">
                {ticket.children_ids.length}개 하위
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
