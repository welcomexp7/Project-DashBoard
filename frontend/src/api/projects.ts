// ============================================================
// 프로젝트 API 호출 함수
// ============================================================

import apiClient from "./client";
import type { ProjectResponse, DashboardResponse } from "@/src/types";

/** 전체 프로젝트 목록 조회 */
export async function fetchProjects(): Promise<ProjectResponse[]> {
  const { data } = await apiClient.get<ProjectResponse[]>("/projects");
  return data;
}

/** 대시보드 데이터 조회 (프로젝트 요약 포함) */
export async function fetchDashboard(): Promise<DashboardResponse> {
  const { data } = await apiClient.get<DashboardResponse>(
    "/projects/dashboard"
  );
  return data;
}

/** 단일 프로젝트 상세 조회 */
export async function fetchProject(
  projectId: string
): Promise<ProjectResponse> {
  const { data } = await apiClient.get<ProjectResponse>(
    `/projects/${projectId}`
  );
  return data;
}
