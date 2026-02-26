"""티켓 관련 Pydantic 응답/요청 스키마"""

from pydantic import BaseModel, Field

from backend.domain.section import Section
from backend.domain.ticket import KanbanStage


class TicketResponse(BaseModel):
    """티켓 단건 응답"""

    ticket_id: str = Field(..., title="티켓 ID", description="고유 식별자 (프로젝트ID:라인번호)")
    title: str = Field(..., title="티켓 제목", description="체크박스 텍스트")
    stage: KanbanStage = Field(..., title="칸반 스테이지", description="현재 스테이지")
    section: Section = Field(..., title="소속 섹션")
    line_number: int = Field(..., title="라인 번호", description="todo.md 원본 라인 번호")
    raw_line: str = Field(..., title="원본 라인", description="포맷 보존용 원본 텍스트")
    indent_level: int = Field(default=0, title="들여쓰기 수준")

    # 에픽/자식 계층 관계
    ticket_type: str = Field(default="standalone", title="티켓 종류", description="standalone | epic | child")
    parent_id: str | None = Field(default=None, title="부모 티켓 ID")
    children_ids: list[str] = Field(default_factory=list, title="자식 티켓 ID 목록")


class MoveTicketRequest(BaseModel):
    """티켓 스테이지 이동 요청"""

    new_stage: KanbanStage = Field(
        ...,
        title="이동할 스테이지",
        description="변경할 칸반 스테이지 (계획, 진행중, 완료, QA Done, 배포)",
    )


class TicketsByStageResponse(BaseModel):
    """스테이지별 티켓 그룹 응답"""

    stage: KanbanStage = Field(..., title="칸반 스테이지")
    tickets: list[TicketResponse] = Field(default_factory=list, title="해당 스테이지의 티켓 목록")


class ProjectTicketsResponse(BaseModel):
    """프로젝트 전체 티켓 응답 (스테이지별 그룹핑)"""

    project_id: str = Field(..., title="프로젝트 ID")
    total: int = Field(..., title="전체 티켓 수")
    tickets: list[TicketResponse] = Field(default_factory=list, title="전체 티켓 목록")
    by_stage: list[TicketsByStageResponse] = Field(
        default_factory=list,
        title="스테이지별 그룹",
        description="각 스테이지별로 그룹핑된 티켓",
    )


class BatchDeleteRequest(BaseModel):
    """복수 티켓 일괄 삭제 요청"""

    ticket_ids: list[str] = Field(..., title="삭제할 티켓 ID 목록")


class MoveEpicRequest(BaseModel):
    """에픽+자식 일괄 스테이지 이동 요청"""

    new_stage: KanbanStage = Field(..., title="이동할 스테이지")
    include_children: bool = Field(default=True, title="자식 티켓 포함 여부")


class CreateTicketRequest(BaseModel):
    """티켓 생성 요청"""

    section_name: str = Field(
        ...,
        min_length=1,
        title="소속 섹션명",
        description="todo.md의 ## 헤더 텍스트",
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        title="티켓 제목",
    )


class CreateChildTicketRequest(BaseModel):
    """하위 티켓 생성 요청"""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        title="하위 티켓 제목",
    )
