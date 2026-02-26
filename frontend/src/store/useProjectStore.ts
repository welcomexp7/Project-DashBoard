// ============================================================
// 프로젝트 전역 상태 관리 (Zustand)
// ============================================================

import { create } from "zustand";
import type { ProjectResponse, DashboardResponse } from "@/src/types";
import {
  fetchProjects as apiFetchProjects,
  fetchDashboard as apiFetchDashboard,
} from "@/src/api/projects";

interface ProjectState {
  /** 프로젝트 목록 */
  projects: ProjectResponse[];
  /** 대시보드 데이터 */
  dashboard: DashboardResponse | null;
  /** 현재 선택된 프로젝트 ID */
  selectedProjectId: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;

  /** 프로젝트 목록 가져오기 */
  fetchProjects: () => Promise<void>;
  /** 대시보드 데이터 가져오기 */
  fetchDashboard: () => Promise<void>;
  /** 프로젝트 선택 */
  selectProject: (projectId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  dashboard: null,
  selectedProjectId: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await apiFetchProjects();
      set({ projects, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "프로젝트 목록 로딩 실패";
      set({ error: message, isLoading: false });
    }
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await apiFetchDashboard();
      set({ dashboard, projects: dashboard.projects, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "대시보드 로딩 실패";
      set({ error: message, isLoading: false });
    }
  },

  selectProject: (projectId) => {
    set({ selectedProjectId: projectId });
  },
}));
