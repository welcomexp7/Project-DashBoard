// ============================================================
// 칸반 보드 전역 상태 관리 (Zustand)
// 낙관적 업데이트 패턴 적용
// ============================================================

import { create } from "zustand";
import type {
  TicketResponse,
  KanbanStage,
  ProjectTicketsResponse,
} from "@/src/types";
import {
  fetchTickets as apiFetchTickets,
  moveTicketStage as apiMoveTicketStage,
  deleteTicket as apiDeleteTicket,
  batchDeleteTickets as apiBatchDeleteTickets,
  createTicket as apiCreateTicket,
  createChildTicket as apiCreateChildTicket,
} from "@/src/api/tickets";
import { KANBAN_STAGES } from "@/src/constants/kanban";

interface ByStageEntry {
  stage: KanbanStage;
  tickets: TicketResponse[];
}

interface KanbanState {
  /** 전체 티켓 목록 */
  tickets: TicketResponse[];
  /** 스테이지별 티켓 그룹 */
  byStage: ByStageEntry[];
  /** 총 티켓 수 */
  total: number;
  /** 현재 프로젝트 ID */
  projectId: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;

  /** 프로젝트별 티켓 가져오기 */
  fetchTickets: (projectId: string) => Promise<void>;
  /** 티켓 스테이지 이동 (낙관적 업데이트) */
  moveTicket: (
    ticketId: string,
    newStage: KanbanStage
  ) => Promise<void>;
  /** 복수 티켓 일괄 스테이지 이동 (낙관적 업데이트 + 부분 롤백) */
  moveTickets: (
    ticketIds: string[],
    newStage: KanbanStage
  ) => Promise<void>;
  /** 티켓 삭제 (낙관적 + 서버 응답으로 전체 교체) */
  deleteTicket: (ticketId: string, cascade?: boolean) => Promise<void>;
  /** 복수 티켓 일괄 삭제 */
  deleteTickets: (ticketIds: string[]) => Promise<void>;
  /** 티켓 생성 (서버 응답으로 전체 교체) */
  createTicket: (sectionName: string, title: string) => Promise<void>;
  /** 하위 티켓 생성 (서버 응답으로 전체 교체) */
  createChildTicket: (parentTicketId: string, title: string) => Promise<void>;

  /** 검색어 (제목 기반) */
  searchQuery: string;
  /** 섹션 카테고리 필터 (다중 선택, 예: ["FE", "BE"]) */
  filterCategories: Set<string>;
  /** 티켓 타입 필터 (다중 선택, 예: ["epic", "child"]) */
  filterTypes: Set<string>;

  setSearchQuery: (query: string) => void;
  toggleFilterCategory: (label: string) => void;
  toggleFilterType: (type: string) => void;
  clearFilters: () => void;
}

/** 티켓 배열을 스테이지별로 그룹핑 */
function groupByStage(tickets: TicketResponse[]): ByStageEntry[] {
  return KANBAN_STAGES.map(({ key }) => ({
    stage: key,
    tickets: tickets.filter((t) => t.stage === key),
  }));
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  tickets: [],
  byStage: KANBAN_STAGES.map(({ key }) => ({ stage: key, tickets: [] })),
  total: 0,
  projectId: null,
  isLoading: false,
  error: null,

  searchQuery: "",
  filterCategories: new Set<string>(),
  filterTypes: new Set<string>(),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  toggleFilterCategory: (label: string) => {
    const prev = get().filterCategories;
    const next = new Set(prev);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    set({ filterCategories: next });
  },

  toggleFilterType: (type: string) => {
    const prev = get().filterTypes;
    const next = new Set(prev);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    set({ filterTypes: next });
  },

  clearFilters: () =>
    set({
      searchQuery: "",
      filterCategories: new Set<string>(),
      filterTypes: new Set<string>(),
    }),

  fetchTickets: async (projectId: string) => {
    // 프로젝트 전환 시 필터 초기화
    set({
      isLoading: true, error: null, projectId,
      searchQuery: "", filterCategories: new Set<string>(), filterTypes: new Set<string>(),
    });
    try {
      const data: ProjectTicketsResponse = await apiFetchTickets(projectId);
      set({
        tickets: data.tickets,
        byStage: groupByStage(data.tickets),
        total: data.total,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "티켓 목록 로딩 실패";
      set({ error: message, isLoading: false });
    }
  },

  moveTicket: async (ticketId: string, newStage: KanbanStage) => {
    const { tickets: prevTickets, projectId } = get();
    if (!projectId) return;

    // 낙관적 업데이트: UI를 먼저 변경
    const optimisticTickets = prevTickets.map((t) =>
      t.ticket_id === ticketId ? { ...t, stage: newStage } : t
    );
    set({
      tickets: optimisticTickets,
      byStage: groupByStage(optimisticTickets),
    });

    try {
      // 실제 API 호출
      await apiMoveTicketStage(projectId, ticketId, newStage);
    } catch (err) {
      // 실패 시 롤백
      set({
        tickets: prevTickets,
        byStage: groupByStage(prevTickets),
        error:
          err instanceof Error ? err.message : "티켓 이동 실패 - 롤백됨",
      });
    }
  },

  moveTickets: async (ticketIds: string[], newStage: KanbanStage) => {
    const { tickets: prevTickets, projectId } = get();
    if (!projectId || ticketIds.length === 0) return;

    // 낙관적 업데이트: 모든 대상 티켓을 즉시 이동
    const idSet = new Set(ticketIds);
    const optimistic = prevTickets.map((t) =>
      idSet.has(t.ticket_id) ? { ...t, stage: newStage } : t
    );
    set({ tickets: optimistic, byStage: groupByStage(optimistic) });

    // API 병렬 호출
    const results = await Promise.allSettled(
      ticketIds.map((id) => apiMoveTicketStage(projectId, id, newStage))
    );

    // 실패한 티켓만 롤백
    const failedIds = new Set<string>();
    results.forEach((r, i) => {
      if (r.status === "rejected") failedIds.add(ticketIds[i]);
    });

    if (failedIds.size > 0) {
      const current = get().tickets;
      const rolledBack = current.map((t) => {
        if (!failedIds.has(t.ticket_id)) return t;
        return prevTickets.find((p) => p.ticket_id === t.ticket_id) ?? t;
      });
      set({
        tickets: rolledBack,
        byStage: groupByStage(rolledBack),
        error: `${failedIds.size}개 티켓 이동 실패 - 부분 롤백`,
      });
    }
  },

  deleteTicket: async (ticketId: string, cascade: boolean = false) => {
    const { tickets: prevTickets, projectId } = get();
    if (!projectId) return;

    const target = prevTickets.find((t) => t.ticket_id === ticketId);
    if (!target) return;

    // 삭제 대상 ID 집합 결정
    const idsToRemove = new Set([ticketId]);
    if (cascade && target.children_ids.length > 0) {
      target.children_ids.forEach((id) => idsToRemove.add(id));
    }

    // 낙관적 삭제
    const optimistic = prevTickets.filter((t) => !idsToRemove.has(t.ticket_id));
    set({
      tickets: optimistic,
      byStage: groupByStage(optimistic),
      total: optimistic.length,
    });

    try {
      const data = await apiDeleteTicket(projectId, ticketId, cascade);
      // 서버 응답으로 전체 교체 (라인번호 갱신)
      set({
        tickets: data.tickets,
        byStage: groupByStage(data.tickets),
        total: data.total,
      });
    } catch (err) {
      // 롤백
      set({
        tickets: prevTickets,
        byStage: groupByStage(prevTickets),
        total: prevTickets.length,
        error: err instanceof Error ? err.message : "삭제 실패 - 롤백됨",
      });
    }
  },

  deleteTickets: async (ticketIds: string[]) => {
    const { tickets: prevTickets, projectId } = get();
    if (!projectId || ticketIds.length === 0) return;

    // 낙관적 삭제
    const idSet = new Set(ticketIds);
    const optimistic = prevTickets.filter((t) => !idSet.has(t.ticket_id));
    set({
      tickets: optimistic,
      byStage: groupByStage(optimistic),
      total: optimistic.length,
    });

    try {
      const data = await apiBatchDeleteTickets(projectId, ticketIds);
      set({
        tickets: data.tickets,
        byStage: groupByStage(data.tickets),
        total: data.total,
      });
    } catch (err) {
      set({
        tickets: prevTickets,
        byStage: groupByStage(prevTickets),
        total: prevTickets.length,
        error: err instanceof Error ? err.message : "일괄 삭제 실패 - 롤백됨",
      });
    }
  },

  createTicket: async (sectionName: string, title: string) => {
    const { projectId } = get();
    if (!projectId) return;

    try {
      const data = await apiCreateTicket(projectId, sectionName, title);
      // 서버 응답으로 전체 교체 (삭제 패턴과 동일)
      set({
        tickets: data.tickets,
        byStage: groupByStage(data.tickets),
        total: data.total,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "티켓 생성 실패",
      });
    }
  },

  createChildTicket: async (parentTicketId: string, title: string) => {
    const { projectId } = get();
    if (!projectId) return;

    try {
      const data = await apiCreateChildTicket(projectId, parentTicketId, title);
      set({
        tickets: data.tickets,
        byStage: groupByStage(data.tickets),
        total: data.total,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "하위 티켓 생성 실패",
      });
    }
  },
}));
