"""todo.md 파싱 엔진 — 마크다운 체크박스를 구조화된 Ticket 데이터로 변환"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from backend.domain.section import Section
from backend.domain.ticket import MARKER_TO_STAGE, KanbanStage, Ticket, TicketType


@dataclass
class ParseResult:
    """todo.md 파싱 결과"""

    project_title: str = ""
    sections: list[Section] = field(default_factory=list)
    tickets: list[Ticket] = field(default_factory=list)


class TodoParser:
    """todo.md 파일을 파싱하여 구조화된 데이터로 변환"""

    # 체크박스 패턴: "- [마커] 내용" (들여쓰기 허용)
    CHECKBOX_RE = re.compile(r"^(\s*)- \[([xX ~QD])\]\s+(.+)$")
    # 섹션 헤더 패턴
    SECTION_RE = re.compile(r"^##\s+(.+)$")
    # 프로젝트 제목 패턴 (첫 번째 # 라인)
    TITLE_RE = re.compile(r"^#\s+(.+)$")

    def parse(self, file_path: str, project_id: str) -> ParseResult:
        """
        todo.md를 읽어 제목, 섹션, 티켓 목록을 반환.

        알고리즘:
        1. # 라인 → 프로젝트 제목
        2. ## 라인 → 현재 섹션 갱신
        3. - [*] 라인 → Ticket 생성 (현재 섹션 소속)
        """
        path = Path(file_path)
        if not path.exists():
            return ParseResult()

        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()

        result = ParseResult()
        current_section: Optional[Section] = None

        for line_num, line in enumerate(lines, start=1):
            # 프로젝트 제목 추출 (첫 번째 # 만)
            if not result.project_title:
                title_match = self.TITLE_RE.match(line)
                if title_match:
                    result.project_title = title_match.group(1).strip()
                    continue

            # 섹션 헤더 갱신
            section_match = self.SECTION_RE.match(line)
            if section_match:
                current_section = Section(
                    name=section_match.group(1).strip(),
                    line_number=line_num,
                )
                result.sections.append(current_section)
                continue

            # 체크박스 → 티켓 변환
            checkbox_match = self.CHECKBOX_RE.match(line)
            if checkbox_match:
                indent = checkbox_match.group(1)
                marker_char = checkbox_match.group(2)
                content = checkbox_match.group(3).strip()

                stage = MARKER_TO_STAGE.get(marker_char, KanbanStage.PLAN)
                fallback_section = Section(name="미분류", line_number=0)

                ticket = Ticket(
                    ticket_id=f"{project_id}:{line_num}",
                    title=content,
                    stage=stage,
                    section=current_section or fallback_section,
                    line_number=line_num,
                    raw_line=line,
                    indent_level=len(indent) // 2,
                )
                result.tickets.append(ticket)

        # 후처리: indent_level 기반 에픽/자식 계층 구축
        self._build_hierarchy(result.tickets)
        return result

    def _build_hierarchy(self, tickets: list[Ticket]) -> None:
        """
        indent_level 기반으로 부모-자식 관계 설정.

        알고리즘: 스택 기반 부모 추적
        - indent_level이 증가하면 직전 티켓이 부모 (에픽)
        - indent_level이 감소하면 스택에서 pop
        - 부모 없는 indent>0 티켓은 STANDALONE 유지 (안전)
        """
        parent_stack: list[Ticket] = []

        for ticket in tickets:
            # 스택에서 현재 레벨 이상의 부모 제거
            while parent_stack and parent_stack[-1].indent_level >= ticket.indent_level:
                parent_stack.pop()

            if ticket.indent_level > 0 and parent_stack:
                # 자식 티켓
                parent = parent_stack[-1]
                ticket.ticket_type = TicketType.CHILD
                ticket.parent_id = parent.ticket_id
                parent.children_ids.append(ticket.ticket_id)
                parent.ticket_type = TicketType.EPIC

            parent_stack.append(ticket)
