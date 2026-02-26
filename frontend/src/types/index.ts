// ============================================================
// 공통 타입 정의
// 백엔드 API 응답 타입과 1:1 매핑
// ============================================================

/** 칸반 스테이지 (한국어 기반 유비쿼터스 언어) */
export type KanbanStage = "계획" | "진행중" | "완료" | "QA Done" | "배포";

/** 섹션: TODO 파일 내 구분 단위 */
export interface Section {
  name: string;
  line_number: number;
}

/** 티켓 종류 — 에픽/자식/독립 구분 */
export type TicketType = "standalone" | "epic" | "child";

/** 티켓: 칸반 보드의 최소 작업 단위 */
export interface TicketResponse {
  ticket_id: string;
  title: string;
  stage: KanbanStage;
  section: Section;
  line_number: number;
  raw_line: string;
  indent_level: number;
  /** 에픽/자식 계층 관계 */
  ticket_type: TicketType;
  parent_id: string | null;
  children_ids: string[];
}

/** 프로젝트: 하나의 관리 단위 */
export interface ProjectResponse {
  project_id: string;
  name: string;
  path: string;
  todo_file_path: string;
  sections: Section[];
  ticket_count_by_stage: Record<string, number>;
  color: string;
}

/** 대시보드: 전체 프로젝트 요약 */
export interface DashboardResponse {
  total_projects: number;
  total_tickets: number;
  total_by_stage: Record<string, number>;
  projects: ProjectResponse[];
}

/** 프로젝트별 티켓 목록 응답 */
export interface ProjectTicketsResponse {
  project_id: string;
  total: number;
  tickets: TicketResponse[];
  by_stage: { stage: KanbanStage; tickets: TicketResponse[] }[];
}

/** 에이전트 호출 상태 */
export type AgentStatus = "pending" | "running" | "completed" | "failed";

/** 에이전트 호출 응답 */
export interface AgentInvocation {
  invocation_id: string;
  status: AgentStatus;
  output_lines?: string[];
}

/** 에이전트 실행 모드 */
export type AgentMode = "one_shot" | "interactive";

/** 대화형 에이전트 실행 응답 */
export interface AgentLaunchResult {
  launched: boolean;
  pid: number | null;
  error: string | null;
}

/** 노트 섹터: 프로젝트 노트 내 분류 단위 */
export interface NoteSector {
  name: string;
  content: string;
}

/** 프로젝트 노트 응답 */
export interface ProjectNoteResponse {
  project_id: string;
  sectors: NoteSector[];
}

/** 푸쉬 결과 응답 */
export interface PushNoteResponse {
  project_id: string;
  pushed_files: string[];
}
