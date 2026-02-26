"""프로젝트 관련 Pydantic 응답/요청 스키마"""

from pydantic import BaseModel, ConfigDict, Field

from backend.domain.section import Section


class ProjectResponse(BaseModel):
    """프로젝트 단건 응답"""

    model_config = ConfigDict(from_attributes=True)

    project_id: str = Field(..., title="프로젝트 ID", description="폴더명 (예: pj.1)")
    name: str = Field(..., title="프로젝트명", description="todo.md 제목에서 추출")
    path: str = Field(..., title="프로젝트 경로", description="절대 경로")
    todo_file_path: str = Field(..., title="todo.md 경로", description="todo.md 절대 경로")
    sections: list[Section] = Field(default_factory=list, title="섹션 목록")
    ticket_count_by_stage: dict[str, int] = Field(
        default_factory=dict,
        title="스테이지별 티켓 수",
        description="각 칸반 스테이지의 티켓 수 집계",
    )
    color: str = Field(..., title="프로젝트 색상", description="UI 식별용 hex 색상")


class DashboardResponse(BaseModel):
    """대시보드 집계 응답"""

    total_projects: int = Field(..., title="전체 프로젝트 수")
    total_tickets: int = Field(..., title="전체 티켓 수")
    total_by_stage: dict[str, int] = Field(
        default_factory=dict,
        title="전체 스테이지별 티켓 수",
        description="모든 프로젝트를 합산한 스테이지별 집계",
    )
    projects: list[ProjectResponse] = Field(
        default_factory=list,
        title="프로젝트 목록",
        description="각 프로젝트의 요약 정보",
    )
