// ============================================================
// 티켓 API 호출 함수
// ============================================================

import apiClient from "./client";
import type {
  ProjectTicketsResponse,
  TicketResponse,
  KanbanStage,
} from "@/src/types";

/** 프로젝트별 티켓 목록 조회 */
export async function fetchTickets(
  projectId: string
): Promise<ProjectTicketsResponse> {
  const { data } = await apiClient.get<ProjectTicketsResponse>(
    `/projects/${projectId}/tickets`
  );
  return data;
}

/** 티켓 스테이지 이동 */
export async function moveTicketStage(
  projectId: string,
  ticketId: string,
  newStage: KanbanStage
): Promise<TicketResponse> {
  const { data } = await apiClient.patch<TicketResponse>(
    `/projects/${projectId}/tickets/${ticketId}/stage`,
    { new_stage: newStage }
  );
  return data;
}

/** 티켓 삭제 */
export async function deleteTicket(
  projectId: string,
  ticketId: string,
  cascade: boolean = false
): Promise<ProjectTicketsResponse> {
  const { data } = await apiClient.delete<ProjectTicketsResponse>(
    `/projects/${projectId}/tickets/${ticketId}`,
    { params: { cascade } }
  );
  return data;
}

/** 복수 티켓 일괄 삭제 */
export async function batchDeleteTickets(
  projectId: string,
  ticketIds: string[]
): Promise<ProjectTicketsResponse> {
  const { data } = await apiClient.post<ProjectTicketsResponse>(
    `/projects/${projectId}/tickets/batch-delete`,
    { ticket_ids: ticketIds }
  );
  return data;
}

/** 티켓 생성 */
export async function createTicket(
  projectId: string,
  sectionName: string,
  title: string
): Promise<ProjectTicketsResponse> {
  const { data } = await apiClient.post<ProjectTicketsResponse>(
    `/projects/${projectId}/tickets`,
    { section_name: sectionName, title }
  );
  return data;
}

/** 하위 티켓 생성 */
export async function createChildTicket(
  projectId: string,
  parentTicketId: string,
  title: string
): Promise<ProjectTicketsResponse> {
  const { data } = await apiClient.post<ProjectTicketsResponse>(
    `/projects/${projectId}/tickets/${parentTicketId}/children`,
    { title }
  );
  return data;
}

/** 에픽+자식 일괄 스테이지 이동 */
export async function moveEpicStage(
  projectId: string,
  ticketId: string,
  newStage: KanbanStage,
  includeChildren: boolean = true
): Promise<TicketResponse[]> {
  const { data } = await apiClient.patch<TicketResponse[]>(
    `/projects/${projectId}/tickets/${ticketId}/move-epic`,
    { new_stage: newStage, include_children: includeChildren }
  );
  return data;
}
