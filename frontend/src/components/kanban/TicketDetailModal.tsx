"use client";

// ============================================================
// 티켓 상세 정보 모달 — JIRA 스타일 레이아웃
// Aceternity UI: Glassmorphism + 상단 그라디언트 라인
// 상위 계획(연결된 이슈) + 에이전트 실행 + 삭제
// ============================================================

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Bot, Terminal, Trash2, AlertTriangle, Plus } from "lucide-react";
import type { TicketResponse, KanbanStage, AgentMode } from "@/src/types";
import { KANBAN_STAGES, getStageConfig } from "@/src/constants/kanban";
import Badge from "@/src/components/common/Badge";
import { cn } from "@/src/lib/utils";

interface TicketDetailModalProps {
  /** 단일 티켓 또는 멀티셀렉 티켓 배열 */
  tickets: TicketResponse[];
  /** 전체 티켓 목록 (에픽/자식 lookup용) */
  allTickets?: TicketResponse[];
  onClose: () => void;
  onStageChange: (ticketId: string, newStage: KanbanStage) => void;
  onInvokeAgent: (tickets: TicketResponse[], additionalPrompt?: string, mode?: AgentMode) => void;
  onDeleteTicket: (ticketId: string, cascade?: boolean) => void;
  onDeleteTickets: (ticketIds: string[]) => void;
  onCreateChildTicket?: (parentTicketId: string, title: string) => void;
}

export default function TicketDetailModal({
  tickets,
  allTickets,
  onClose,
  onStageChange,
  onInvokeAgent,
  onDeleteTicket,
  onDeleteTickets,
  onCreateChildTicket,
}: TicketDetailModalProps) {
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("interactive");
  const [deleteConfirm, setDeleteConfirm] = useState<"idle" | "confirm" | "cascade">("idle");
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const childInputRef = useRef<HTMLInputElement>(null);

  const isMulti = tickets.length > 1;
  const ticket = tickets[0] ?? null;
  const isEpic = ticket?.ticket_type === "epic";
  const isChild = ticket?.ticket_type === "child";

  const handleStageSelect = useCallback(
    (newStage: KanbanStage) => {
      if (!ticket) return;
      onStageChange(ticket.ticket_id, newStage);
      setIsStageDropdownOpen(false);
    },
    [ticket, onStageChange]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const handleInvokeAgent = useCallback(() => {
    const prompt = additionalPrompt.trim() || undefined;
    onInvokeAgent(tickets, prompt, agentMode);
    setAdditionalPrompt("");
  }, [tickets, additionalPrompt, agentMode, onInvokeAgent]);

  const handleAddChildSubmit = useCallback(() => {
    const title = childTitle.trim();
    if (!title || !ticket || !onCreateChildTicket) return;
    onCreateChildTicket(ticket.ticket_id, title);
    setChildTitle("");
    setIsAddingChild(false);
  }, [childTitle, ticket, onCreateChildTicket]);

  const handleDeleteClick = useCallback(() => {
    if (isMulti) {
      setDeleteConfirm("confirm");
    } else if (isEpic) {
      setDeleteConfirm("cascade");
    } else {
      setDeleteConfirm("confirm");
    }
  }, [isMulti, isEpic]);

  const handleDeleteConfirm = useCallback(
    (cascade?: boolean) => {
      if (isMulti) {
        onDeleteTickets(tickets.map((t) => t.ticket_id));
      } else if (ticket) {
        onDeleteTicket(ticket.ticket_id, cascade);
      }
      setDeleteConfirm("idle");
      onClose();
    },
    [isMulti, ticket, tickets, onDeleteTicket, onDeleteTickets, onClose]
  );

  if (tickets.length === 0) return null;

  const currentStage = ticket ? getStageConfig(ticket.stage) : null;
  const allList = allTickets ?? tickets;

  // 상위 계획: child → 부모 에픽 lookup
  const parentEpic = isChild && ticket?.parent_id
    ? allList.find((t) => t.ticket_id === ticket.parent_id) ?? null
    : null;

  // 상위 계획: child → 형제 티켓 (부모의 children에서 자신 제외)
  const siblings = parentEpic
    ? parentEpic.children_ids
        .filter((id) => id !== ticket!.ticket_id)
        .map((id) => allList.find((t) => t.ticket_id === id))
        .filter(Boolean) as TicketResponse[]
    : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="modal-gradient-line relative flex w-full max-w-lg flex-col rounded-xl border border-white/[0.08] bg-slate-900/80 shadow-2xl backdrop-blur-2xl"
        >
          {/* ── 헤더 ── */}
          <div className="flex items-center justify-between border-b border-white/[0.05] px-6 py-4">
            <h2 className="text-lg font-semibold">
              {isMulti ? `${tickets.length}개 티켓 선택됨` : "티켓 상세"}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ── 본문 ── */}
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {isMulti ? (
                /* ── 멀티셀렉: 선택된 티켓 목록 ── */
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                    선택된 티켓
                  </label>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {tickets.map((t) => (
                      <div
                        key={t.ticket_id}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-sm"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getStageConfig(t.stage).color }}
                        />
                        <span className="flex-1 truncate">{t.title}</span>
                        <Badge className="border border-white/[0.05] bg-white/[0.05] text-muted text-[10px]">
                          {t.section.name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── 단일 티켓 상세 ── */
                <>
                  {/* 제목 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
                      제목
                    </label>
                    <p className="text-base font-medium">{ticket!.title}</p>
                  </div>

                  {/* 섹션 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
                      섹션
                    </label>
                    <Badge
                      size="md"
                      className="border border-white/[0.05] bg-white/[0.05] text-muted"
                    >
                      {ticket!.section.name}
                    </Badge>
                  </div>

                  {/* 스테이지 드롭다운 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
                      스테이지
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium transition-colors hover:border-white/[0.15]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: currentStage!.color }}
                        />
                        {currentStage!.label}
                        <ChevronDown className="ml-1 h-4 w-4 text-muted" />
                      </button>

                      {isStageDropdownOpen && (
                        <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-white/[0.08] bg-slate-900/90 py-1 shadow-lg backdrop-blur-xl">
                          {KANBAN_STAGES.map((stage) => (
                            <button
                              key={stage.key}
                              onClick={() => handleStageSelect(stage.key)}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/[0.05]",
                                ticket!.stage === stage.key && "bg-white/[0.05] font-medium"
                              )}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 상위 계획 (연결된 이슈) ── */}

                  {/* (a) child 티켓: 부모 에픽 + 형제 목록 */}
                  {isChild && parentEpic && (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                        상위 계획
                      </label>
                      <div className="space-y-1.5 rounded-lg border border-accent/10 bg-accent/[0.03] p-3">
                        {/* 부모 에픽 */}
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getStageConfig(parentEpic.stage).color }}
                          />
                          <span className="flex-1 truncate font-medium">{parentEpic.title}</span>
                          <Badge className="border border-accent/20 bg-accent/10 text-accent text-[10px]">
                            에픽
                          </Badge>
                        </div>
                        {/* 형제 티켓 */}
                        {siblings.length > 0 && (
                          <div className="mt-2 max-h-28 space-y-1 overflow-y-auto border-t border-white/[0.05] pt-2">
                            {siblings.map((sib) => (
                              <div
                                key={sib.ticket_id}
                                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted"
                              >
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: getStageConfig(sib.stage).color }}
                                />
                                <span className="flex-1 truncate">{sib.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* (b) epic 티켓 또는 standalone: 하위 티켓 목록 + 추가 */}
                  {(isEpic || (ticket?.ticket_type === "standalone" && onCreateChildTicket)) && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted">
                          하위 티켓{isEpic ? ` (${ticket!.children_ids.length})` : ""}
                        </label>
                        {onCreateChildTicket && (
                          <button
                            onClick={() => {
                              setIsAddingChild(true);
                              setTimeout(() => childInputRef.current?.focus(), 0);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground"
                            title="하위 티켓 추가"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-accent/10 bg-accent/[0.03] p-3">
                        {isEpic && ticket!.children_ids.map((childId) => {
                          const child = allList.find((t) => t.ticket_id === childId) ?? null;
                          return (
                            <div
                              key={childId}
                              className="flex items-center gap-2 rounded-md bg-white/[0.02] px-2.5 py-1.5 text-xs"
                            >
                              {child ? (
                                <>
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: getStageConfig(child.stage).color }}
                                  />
                                  <span className="flex-1 truncate">{child.title}</span>
                                  <span className="text-[10px] text-muted">
                                    {getStageConfig(child.stage).label}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted">{childId}</span>
                              )}
                            </div>
                          );
                        })}
                        {/* 인라인 자식 추가 입력 */}
                        {isAddingChild && (
                          <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-white/[0.03] px-2.5 py-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-muted/30" />
                            <input
                              ref={childInputRef}
                              type="text"
                              value={childTitle}
                              onChange={(e) => setChildTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && childTitle.trim()) {
                                  onCreateChildTicket!(ticket!.ticket_id, childTitle.trim());
                                  setChildTitle("");
                                  setIsAddingChild(false);
                                } else if (e.key === "Escape") {
                                  setChildTitle("");
                                  setIsAddingChild(false);
                                }
                              }}
                              onBlur={() => {
                                if (!childTitle.trim()) {
                                  setIsAddingChild(false);
                                }
                              }}
                              placeholder="새 하위 티켓 제목..."
                              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder-muted/50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── 에이전트 입력 컨테이너 (textarea + 모드/실행 버튼 통합) ── */}
              <div>
                <label className={cn(
                  "mb-1 block text-xs font-medium uppercase tracking-wider",
                  agentMode === "one_shot" ? "text-muted/50" : "text-muted"
                )}>
                  에이전트에게 추가 지시
                </label>
                <div className={cn(
                  "overflow-hidden rounded-lg border transition-colors",
                  agentMode === "one_shot"
                    ? "border-white/[0.04] bg-white/[0.01]"
                    : "border-white/[0.08] bg-white/[0.03] focus-within:border-accent/50"
                )}>
                  <textarea
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.altKey && e.key === "Enter") {
                        e.preventDefault();
                        handleInvokeAgent();
                      }
                    }}
                    disabled={agentMode === "one_shot"}
                    placeholder={
                      agentMode === "one_shot"
                        ? "원샷 모드에서는 추가 지시를 사용할 수 없습니다"
                        : "추가 지시사항을 입력하세요... (Alt+Enter로 실행)"
                    }
                    rows={3}
                    className={cn(
                      "w-full resize-none border-none bg-transparent px-3 py-2 text-sm outline-none",
                      agentMode === "one_shot"
                        ? "cursor-not-allowed text-muted/30 placeholder-muted/30"
                        : "text-foreground placeholder-muted/50"
                    )}
                  />
                  {/* divider */}
                  <div className="border-t border-white/[0.05]" />
                  {/* 모드 토글 + 실행 버튼 */}
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-0.5 rounded-md border border-white/[0.06] p-0.5">
                      <button
                        onClick={() => setAgentMode("interactive")}
                        className={cn(
                          "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                          agentMode === "interactive"
                            ? "bg-accent/20 text-accent"
                            : "text-muted hover:text-foreground"
                        )}
                      >
                        <Terminal className="h-3 w-3" />
                        대화형
                      </button>
                      <button
                        onClick={() => setAgentMode("one_shot")}
                        className={cn(
                          "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                          agentMode === "one_shot"
                            ? "bg-accent/20 text-accent"
                            : "text-muted hover:text-foreground"
                        )}
                      >
                        <Bot className="h-3 w-3" />
                        원샷
                      </button>
                    </div>
                    <button
                      onClick={handleInvokeAgent}
                      className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-colors hover:bg-accent-hover"
                    >
                      {agentMode === "interactive" ? (
                        <Terminal className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      {isMulti ? `${tickets.length}개 실행` : "실행"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 삭제 확인 오버레이 ── */}
          <AnimatePresence>
            {deleteConfirm !== "idle" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm"
              >
                <div className="mx-6 w-full max-w-xs rounded-lg border border-danger/20 bg-slate-900/95 p-5 shadow-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <div className="flex-1">
                      {deleteConfirm === "cascade" ? (
                        <>
                          <p className="text-sm font-medium text-danger">
                            에픽 티켓 삭제
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            이 에픽에는 {ticket!.children_ids.length}개의 하위 티켓이 있습니다.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleDeleteConfirm(false)}
                              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                            >
                              에픽만 삭제
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(true)}
                              className="rounded-lg bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                            >
                              전체 삭제 ({ticket!.children_ids.length + 1}개)
                            </button>
                            <button
                              onClick={() => setDeleteConfirm("idle")}
                              className="ml-auto rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/[0.05] hover:text-foreground"
                            >
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-danger">
                            {isMulti
                              ? `${tickets.length}개 티켓을 삭제하시겠습니까?`
                              : "이 티켓을 삭제하시겠습니까?"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            삭제된 티켓은 todo.md에서 제거됩니다.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteConfirm()}
                              className="rounded-lg bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setDeleteConfirm("idle")}
                              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/[0.05] hover:text-foreground"
                            >
                              취소
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 푸터: 삭제만 ── */}
          <div className="flex items-center justify-center border-t border-white/[0.05] px-6 py-3">
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isMulti ? `${tickets.length}개 삭제` : "삭제"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
