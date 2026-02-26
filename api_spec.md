# API Specification - Kanban Board

Base URL: `http://localhost:8000/api`

## Health Check

### GET /api/health
서버 상태 확인

**Response 200:**
```json
{ "status": "ok", "project": "Kanban Board" }
```

---

## Projects

### GET /api/projects
전체 프로젝트 목록 조회

**Response 200:** `ProjectResponse[]`
```json
[
  {
    "project_id": "pj.1",
    "name": "프로젝트 이름",
    "path": "/absolute/path/to/pj.1",
    "todo_file_path": "/absolute/path/to/pj.1/todo.md",
    "sections": [
      { "name": "섹션명", "line_number": 3 }
    ],
    "ticket_count_by_stage": {
      "계획": 5,
      "진행중": 3,
      "완료": 10,
      "QA Done": 1,
      "배포": 2
    },
    "color": "#6366f1"
  }
]
```

### GET /api/projects/dashboard
대시보드 집계 데이터

**Response 200:** `DashboardResponse`
```json
{
  "total_projects": 2,
  "total_tickets": 79,
  "total_by_stage": {
    "계획": 5,
    "진행중": 3,
    "완료": 60,
    "QA Done": 5,
    "배포": 6
  },
  "projects": [ ...ProjectResponse[] ]
}
```

### GET /api/projects/{project_id}
프로젝트 상세 조회

**Path Params:** `project_id` (string, 예: "pj.1")

**Response 200:** `ProjectResponse`

**Response 404:**
```json
{ "detail": "프로젝트를 찾을 수 없습니다: pj.999" }
```

---

## Tickets

### GET /api/projects/{project_id}/tickets
프로젝트 전체 티켓 조회 (스테이지별 그룹핑 포함)

**Path Params:** `project_id` (string)

**Response 200:** `ProjectTicketsResponse`
```json
{
  "project_id": "pj.1",
  "total": 42,
  "tickets": [
    {
      "ticket_id": "pj.1:4",
      "title": "티켓 제목",
      "stage": "완료",
      "section": { "name": "섹션명", "line_number": 3 },
      "line_number": 4,
      "raw_line": "- [x] 티켓 제목",
      "indent_level": 0
    }
  ],
  "by_stage": [
    {
      "stage": "계획",
      "tickets": [ ...TicketResponse[] ]
    },
    {
      "stage": "진행중",
      "tickets": []
    },
    {
      "stage": "완료",
      "tickets": [ ...TicketResponse[] ]
    },
    {
      "stage": "QA Done",
      "tickets": []
    },
    {
      "stage": "배포",
      "tickets": []
    }
  ]
}
```

### PATCH /api/projects/{project_id}/tickets/{ticket_id}/stage
티켓 스테이지 이동

**Path Params:** `project_id` (string), `ticket_id` (string, 예: "pj.1:4")

**Request Body:**
```json
{
  "new_stage": "진행중"
}
```
`new_stage` 허용값: `"계획"`, `"진행중"`, `"완료"`, `"QA Done"`, `"배포"`

**Response 200:** `TicketResponse`

**Response 404:**
```json
{ "detail": "티켓을 찾을 수 없습니다: pj.1:999" }
```

---

## Agent

### POST /api/agent/invoke
Claude CLI 비동기 호출

**Request Body:**
```json
{
  "project_path": "/absolute/path/to/pj.1",
  "prompt": "todo.md를 분석해줘"
}
```

**Response 200:** `InvokeAgentResponse`
```json
{
  "invocation_id": "uuid-string"
}
```

### GET /api/agent/status/{invocation_id}
Claude CLI 실행 상태 조회

**Path Params:** `invocation_id` (string, UUID)

**Response 200:** `AgentStatusResponse`
```json
{
  "status": "running | completed | failed | not_found",
  "output": "CLI 출력 텍스트",
  "error": null
}
```
