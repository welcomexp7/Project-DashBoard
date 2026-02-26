// ============================================================
// 티켓 필터링 순수 함수
// 클라이언트 사이드 검색/필터 로직 (추가 API 호출 없음)
// ============================================================

import type { TicketResponse } from "@/src/types";
import { getSectionCategory } from "@/src/constants/kanban";

export interface FilterOptions {
  searchQuery: string;
  filterCategories: Set<string>;
  filterTypes: Set<string>;
}

/** 티켓 배열에서 필터 조건에 맞는 티켓만 반환 */
export function filterTickets(
  tickets: TicketResponse[],
  options: FilterOptions
): TicketResponse[] {
  const { searchQuery, filterCategories, filterTypes } = options;

  // 필터가 하나도 없으면 원본 그대로 반환 (참조 동일성 유지)
  if (
    searchQuery.length === 0 &&
    filterCategories.size === 0 &&
    filterTypes.size === 0
  ) {
    return tickets;
  }

  const query = searchQuery.toLowerCase();

  return tickets.filter((ticket) => {
    // 1. 텍스트 검색 (제목)
    if (query && !ticket.title.toLowerCase().includes(query)) return false;

    // 2. 카테고리 필터
    if (filterCategories.size > 0) {
      const cat = getSectionCategory(ticket.section.name);
      if (!filterCategories.has(cat.label)) return false;
    }

    // 3. 타입 필터
    if (filterTypes.size > 0) {
      if (!filterTypes.has(ticket.ticket_type)) return false;
    }

    return true;
  });
}
