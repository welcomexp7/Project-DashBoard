# Project Board - 로컬 프로젝트 관리 도구

## 백엔드 API
### Phase 1: 기본 API 구축
- [x] FastAPI 프로젝트 초기화 및 DDD 4계층 디렉토리 구조 셋업
- [x] Domain 모델 정의 (Ticket Entity, KanbanStage/Marker VO, Section VO, Project Entity)
- [x] todo.md 파서/라이터 엔진 구현 (원본 포맷 보존, 5단계 마커 확장)
- [x] Repository 구현체 (파일시스템 기반 프로젝트/티켓 저장소)
- [x] Application 서비스 계층 (ProjectService, TicketService, AgentService)
- [x] Presentation 라우터 (projects, tickets, agent 엔드포인트)
- [x] SSE 실시간 동기화 (watchfiles + EventSource)
- [x] Claude Code CLI 어댑터 (비동기 subprocess 호출)
### Phase 2: 에픽/계층 & 확장 API
- [x] 에픽/자식 티켓 계층 구조 API (create_child_ticket, move_epic_stage)
- [x] todo.md 파서 계층 지원 (2칸 들여쓰기 파싱, indent_level/parent_id 추출)
- [x] 티켓 삭제 API (DELETE /tickets/{ticket_id})

## 프론트엔드 UI
### Phase 1: 기본 UI 구축
- [x] Next.js (App Router) 초기화 + Tailwind CSS v4 + 다크 테마
- [x] 대시보드 페이지 (전체 프로젝트 개요, 통계, 진행률 바)
- [x] 칸반 보드 페이지 (@dnd-kit 드래그앤드롭 5칼럼)
- [x] Zustand 상태 관리 (낙관적 업데이트 + 롤백)
- [x] 에이전트 연동 UI (확인 모달 + 로그 패널)
- [x] SSE 구독 훅 (todo.md 변경 시 자동 리프레시)
### Phase 2: 티켓 상세 & 필터
- [x] JIRA 스타일 티켓 상세 모달 (TicketDetailModal)
- [x] 카테고리 배지 필터 (섹션 키워드 기반 자동 분류)
- [x] 키워드 검색 필터
- [x] 멀티셀렉 모드 (다중 티켓 선택 + 에이전트 실행/삭제)
### Phase 3: 에픽/계층 UI
- [x] 에픽 카드 UI (좌측 accent 바 + 자식 개수 배지)
- [x] 에픽 하위 티켓 생성 UI (모달 내 자식 추가)
- [x] 프로젝트 드롭다운 전환 (보드 페이지 헤더)
### Phase 4: 브랜딩
- [x] 프로젝트명 변경 (Kanban Board → Project Board)
- [x] DNT 로고 아이콘 적용 (헤더 좌측)

## 기획 / 설계
- [x] CLAUDE.md 칸반 섹션 규약 정의 (todo.md 마커, 섹션 네이밍, 에픽 계층 규칙)
- [x] 커스텀 에이전트 7종 글로벌 설치 (~/.claude/agents/)
  - [x] project-task-planner (todo.md 규약 출력 커스텀)
  - [x] prd-writer (유비쿼터스 언어 + DDD 커스텀)
  - [x] code-refactorer (DDD 4계층 + 한국어 커스텀)
  - [x] frontend-designer (Glassmorphism 토큰 커스텀)
  - [x] security-auditor (FastAPI+Next.js 특화 커스텀)
  - [x] vibe-coding-coach (원본)
  - [x] content-writer (원본)

## QA / 테스트
- [x] 에이전트 원샷 테스트 (프로젝트 맥락 읽기 검증)
- [x] SSE 중복 이벤트 버그 수정 (useRef 콜백 패턴)
- [x] useEffect + isLoading early return 무한루프 버그 수정

