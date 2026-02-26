"""프로젝트 Entity — pj.* 폴더에 대응하는 관리 단위"""

from pydantic import BaseModel, Field

from backend.domain.section import Section


# 프로젝트별 자동 색상 팔레트
PROJECT_COLORS = [
    "#6366f1",  # indigo
    "#ec4899",  # pink
    "#14b8a6",  # teal
    "#f97316",  # orange
    "#84cc16",  # lime
    "#8b5cf6",  # violet
    "#06b6d4",  # cyan
]


class Project(BaseModel):
    """pj.* 폴더에 대응하는 프로젝트"""

    project_id: str = Field(..., description="폴더명 (예: pj.1)")
    name: str = Field(..., description="todo.md 첫 줄 # 제목에서 추출")
    path: str = Field(..., description="프로젝트 절대 경로")
    todo_file_path: str = Field(..., description="todo.md 절대 경로")
    sections: list[Section] = Field(default_factory=list)
    ticket_count_by_stage: dict[str, int] = Field(
        default_factory=dict,
        description="스테이지별 티켓 수 집계",
    )
    color: str = Field(default="#6366f1", description="프로젝트 식별 색상")
