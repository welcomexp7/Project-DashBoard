// ============================================================
// 칸반 스테이지 상수 정의
// 색상, 라벨, 배경색을 중앙 관리
// ============================================================

import type { KanbanStage } from "@/src/types";

export interface StageConfig {
  key: KanbanStage;
  label: string;
  color: string;
  bgColor: string;
}

export const KANBAN_STAGES: StageConfig[] = [
  { key: "계획", label: "계획", color: "#64748b", bgColor: "#1e293b" },
  { key: "진행중", label: "진행중", color: "#f59e0b", bgColor: "#451a03" },
  { key: "완료", label: "완료", color: "#22c55e", bgColor: "#052e16" },
  { key: "QA Done", label: "QA Done", color: "#8b5cf6", bgColor: "#1e1b4b" },
  { key: "배포", label: "배포", color: "#06b6d4", bgColor: "#083344" },
];

/** 스테이지 키로 설정 조회 */
export function getStageConfig(stage: KanbanStage): StageConfig {
  return KANBAN_STAGES.find((s) => s.key === stage) ?? KANBAN_STAGES[0];
}

// ============================================================
// 섹션 카테고리: 키워드 기반 자동 분류 + 색상 매핑
// ============================================================

export interface SectionCategory {
  label: string;
  color: string;
  bgColor: string;
}

export const SECTION_CATEGORIES: { keywords: string[]; category: SectionCategory }[] = [
  {
    keywords: ["프론트엔드", "UI", "UX", "랜딩", "frontend", "Redesign", "화면", "컴포넌트"],
    category: { label: "FE", color: "#60a5fa", bgColor: "rgba(96,165,250,0.12)" },
  },
  {
    keywords: ["백엔드", "API", "backend", "서버", "인증"],
    category: { label: "BE", color: "#4ade80", bgColor: "rgba(74,222,128,0.12)" },
  },
  {
    keywords: ["데이터", "DB", "ORM", "파이프라인", "Data", "모델", "스키마"],
    category: { label: "DATA", color: "#c084fc", bgColor: "rgba(192,132,252,0.12)" },
  },
  {
    keywords: ["인프라", "클라우드", "배포", "CI", "CD", "Docker", "DevOps"],
    category: { label: "INFRA", color: "#22d3ee", bgColor: "rgba(34,211,238,0.12)" },
  },
  {
    keywords: ["QA", "버그", "테스트", "bug", "픽스", "fix"],
    category: { label: "QA", color: "#fb923c", bgColor: "rgba(251,146,60,0.12)" },
  },
  {
    keywords: ["기획", "설계", "요구사항", "plan", "디자인", "design", "폴리싱", "마무리"],
    category: { label: "PLAN", color: "#f472b6", bgColor: "rgba(244,114,182,0.10)" },
  },
  {
    keywords: ["domain", "도메인", "entity", "VO"],
    category: { label: "DOMAIN", color: "#a78bfa", bgColor: "rgba(167,139,250,0.10)" },
  },
];

export const DEFAULT_CATEGORY: SectionCategory = {
  label: "ETC",
  color: "#94a3b8",
  bgColor: "rgba(148,163,184,0.10)",
};

/** 필터 UI에서 사용할 카테고리 목록 (고유 label + 색상) */
export const FILTER_CATEGORIES: SectionCategory[] = [
  ...SECTION_CATEGORIES.map((s) => s.category),
  DEFAULT_CATEGORY,
];

/** 섹션명에서 카테고리 자동 추출 (키워드 매칭) */
export function getSectionCategory(sectionName: string): SectionCategory {
  const lower = sectionName.toLowerCase();
  for (const { keywords, category } of SECTION_CATEGORIES) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return category;
    }
  }
  return DEFAULT_CATEGORY;
}
