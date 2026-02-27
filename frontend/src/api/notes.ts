// ============================================================
// 프로젝트 노트 API 호출 함수
// ============================================================

import apiClient from "./client";
import type {
  ProjectNoteResponse,
  NoteSector,
  PushNoteResponse,
} from "@/src/types";

/** 프로젝트 노트 조회 */
export async function fetchNote(
  projectId: string
): Promise<ProjectNoteResponse> {
  const { data } = await apiClient.get<ProjectNoteResponse>(
    `/projects/${projectId}/notes`
  );
  return data;
}

/** 프로젝트 노트 저장 */
export async function saveNote(
  projectId: string,
  sectors: NoteSector[]
): Promise<ProjectNoteResponse> {
  const { data } = await apiClient.put<ProjectNoteResponse>(
    `/projects/${projectId}/notes`,
    { sectors }
  );
  return data;
}

/** 프로젝트에 노트 내보내기 (선택된 섹터만 또는 전체) */
export async function pushNote(
  projectId: string,
  sectorNames?: string[]
): Promise<PushNoteResponse> {
  const { data } = await apiClient.post<PushNoteResponse>(
    `/projects/${projectId}/notes/push`,
    sectorNames ? { sector_names: sectorNames } : undefined
  );
  return data;
}
