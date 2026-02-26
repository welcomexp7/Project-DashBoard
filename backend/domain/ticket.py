"""티켓 Entity + KanbanStage/Marker Value Object — 칸반보드의 핵심 도메인 모델"""

import re
from enum import Enum

from pydantic import BaseModel, Field

from backend.domain.section import Section


class TicketType(str, Enum):
    """티켓 종류 — 에픽/자식/독립 구분"""

    STANDALONE = "standalone"  # 독립 티켓 (하위 없음)
    EPIC = "epic"              # 에픽 (하위 티켓 보유)
    CHILD = "child"            # 자식 티켓 (에픽 소속)


class KanbanStage(str, Enum):
    """칸반 5단계 스테이지 (todo.md 마커와 1:1 매핑)"""

    PLAN = "계획"
    IN_PROGRESS = "진행중"
    DONE = "완료"
    QA_DONE = "QA Done"
    DEPLOYED = "배포"


class Marker(str, Enum):
    """todo.md 체크박스 마커 문자"""

    PLAN = " "
    IN_PROGRESS = "~"
    DONE = "x"
    QA_DONE = "Q"
    DEPLOYED = "D"


# 마커 → 스테이지 매핑 (하위 호환: 대문자 X도 완료 처리)
MARKER_TO_STAGE: dict[str, KanbanStage] = {
    " ": KanbanStage.PLAN,
    "~": KanbanStage.IN_PROGRESS,
    "x": KanbanStage.DONE,
    "X": KanbanStage.DONE,
    "Q": KanbanStage.QA_DONE,
    "D": KanbanStage.DEPLOYED,
}

# 스테이지 → 마커 매핑
STAGE_TO_MARKER: dict[KanbanStage, str] = {
    KanbanStage.PLAN: " ",
    KanbanStage.IN_PROGRESS: "~",
    KanbanStage.DONE: "x",
    KanbanStage.QA_DONE: "Q",
    KanbanStage.DEPLOYED: "D",
}

# 체크박스 정규식: "- [마커] 내용" (들여쓰기 허용)
CHECKBOX_PATTERN = re.compile(r"^(\s*)- \[([xX ~QD])\]\s+(.+)$")


class Ticket(BaseModel):
    """칸반 보드의 기본 단위 — todo.md의 체크박스 항목 하나"""

    ticket_id: str = Field(..., description="고유 식별자 (프로젝트ID:라인번호)")
    title: str = Field(..., description="마커 제거 후 순수 텍스트")
    stage: KanbanStage = Field(..., description="현재 칸반 스테이지")
    section: Section = Field(..., description="소속 섹션 (카테고리)")
    line_number: int = Field(..., description="todo.md 원본 라인 번호")
    raw_line: str = Field(..., description="원본 라인 텍스트 (포맷 보존용)")
    indent_level: int = Field(default=0, description="들여쓰기 수준")

    # 에픽/자식 계층 관계 (파서 후처리에서 설정)
    ticket_type: TicketType = Field(default=TicketType.STANDALONE, description="티켓 종류")
    parent_id: str | None = Field(default=None, description="부모 티켓 ID (에픽 소속 시)")
    children_ids: list[str] = Field(default_factory=list, description="자식 티켓 ID 목록 (에픽일 때)")

    def move_to(self, new_stage: KanbanStage) -> "Ticket":
        """새로운 스테이지로 이동한 복사본 반환 (불변 패턴)"""
        new_marker = STAGE_TO_MARKER[new_stage]
        new_raw = CHECKBOX_PATTERN.sub(
            rf"\g<1>- [{new_marker}] \g<3>",
            self.raw_line,
            count=1,
        )
        return self.model_copy(update={"stage": new_stage, "raw_line": new_raw})
