"""파일 시스템 기반 티켓 저장소 — todo.md 파싱/쓰기를 통한 티켓 CRUD"""

from pathlib import Path
from typing import Optional

from backend.core.config import settings
from backend.domain.interfaces import TicketRepository
from backend.domain.ticket import KanbanStage, Ticket
from backend.infrastructure.file_system.todo_parser import TodoParser
from backend.infrastructure.file_system.todo_writer import TodoWriter


class FileTicketRepository(TicketRepository):
    """todo.md 파일을 직접 읽고 쓰는 티켓 저장소 구현체"""

    def __init__(self) -> None:
        self._parser = TodoParser()
        self._writer = TodoWriter()
        self._root = Path(settings.PROJECTS_ROOT)

    def _todo_path(self, project_id: str) -> str:
        """프로젝트 ID로 todo.md 절대 경로 반환"""
        return str(self._root / project_id / "todo.md")

    async def get_all_by_project(self, project_id: str) -> list[Ticket]:
        """특정 프로젝트의 모든 티켓 반환"""
        todo_path = self._todo_path(project_id)
        result = self._parser.parse(todo_path, project_id)
        return result.tickets

    async def get_by_id(
        self, project_id: str, ticket_id: str
    ) -> Optional[Ticket]:
        """특정 티켓 조회 (ticket_id = 'pj.X:라인번호')"""
        tickets = await self.get_all_by_project(project_id)
        for ticket in tickets:
            if ticket.ticket_id == ticket_id:
                return ticket
        return None

    async def update_stage(
        self, project_id: str, ticket_id: str, new_stage: KanbanStage
    ) -> Ticket:
        """
        티켓 스테이지 변경 흐름:
        1. 현재 티켓 조회
        2. TodoWriter로 마커 교체 (파일 쓰기)
        3. 재파싱하여 최신 상태의 Ticket 반환
        """
        # 현재 티켓 조회
        ticket = await self.get_by_id(project_id, ticket_id)
        if ticket is None:
            raise ValueError(f"티켓을 찾을 수 없습니다: {ticket_id}")

        # todo.md 마커 교체
        todo_path = self._todo_path(project_id)
        await self._writer.update_ticket_stage(
            file_path=todo_path,
            line_number=ticket.line_number,
            new_stage=new_stage,
        )

        # 재파싱하여 변경 후 최신 티켓 반환
        updated_ticket = await self.get_by_id(project_id, ticket_id)
        if updated_ticket is None:
            raise ValueError(
                f"스테이지 변경 후 티켓 재조회 실패: {ticket_id}"
            )
        return updated_ticket

    async def delete_ticket(
        self, project_id: str, ticket_id: str
    ) -> list[Ticket]:
        """단일 티켓 삭제 → 재파싱하여 최신 목록 반환"""
        ticket = await self.get_by_id(project_id, ticket_id)
        if ticket is None:
            raise ValueError(f"티켓을 찾을 수 없습니다: {ticket_id}")

        todo_path = self._todo_path(project_id)
        await self._writer.delete_lines(todo_path, [ticket.line_number])

        # 재파싱 (라인번호 재계산됨)
        return await self.get_all_by_project(project_id)

    async def delete_tickets(
        self, project_id: str, ticket_ids: list[str]
    ) -> list[Ticket]:
        """복수 티켓 일괄 삭제 (한 번의 파일 쓰기로 처리)"""
        tickets = await self.get_all_by_project(project_id)
        id_set = set(ticket_ids)
        targets = [t for t in tickets if t.ticket_id in id_set]

        if not targets:
            raise ValueError(f"삭제 대상 티켓이 없습니다: {ticket_ids}")

        todo_path = self._todo_path(project_id)
        await self._writer.delete_lines(
            todo_path, [t.line_number for t in targets]
        )

        # 재파싱 (라인번호 재계산됨)
        return await self.get_all_by_project(project_id)

    async def create_child_ticket(
        self, project_id: str, parent_ticket_id: str, title: str
    ) -> list[Ticket]:
        """
        부모 티켓 아래에 자식 티켓 생성.

        부모 ticket_id로 라인번호를 찾아
        TodoWriter.insert_child_ticket()으로 들여쓰기 삽입 후
        재파싱하여 최신 전체 목록을 반환한다.
        """
        todo_path = self._todo_path(project_id)
        tickets = await self.get_all_by_project(project_id)

        parent = next(
            (t for t in tickets if t.ticket_id == parent_ticket_id),
            None,
        )
        if parent is None:
            raise ValueError(f"부모 티켓을 찾을 수 없습니다: {parent_ticket_id}")

        await self._writer.insert_child_ticket(
            file_path=todo_path,
            parent_line_number=parent.line_number,
            title=title,
        )

        # 재파싱 (라인번호 + 계층 재계산됨)
        return await self.get_all_by_project(project_id)

    async def create_ticket(
        self, project_id: str, section_name: str, title: str
    ) -> list[Ticket]:
        """
        티켓 생성: 지정 섹션에 새 체크박스 삽입 후 재파싱.

        section_name으로 섹션을 찾아 line_number를 얻고,
        TodoWriter.insert_ticket()으로 파일에 삽입한 뒤
        재파싱하여 최신 전체 목록을 반환한다.
        """
        todo_path = self._todo_path(project_id)
        result = self._parser.parse(todo_path, project_id)

        # 섹션 이름으로 검색
        target_section = next(
            (s for s in result.sections if s.name == section_name),
            None,
        )
        if target_section is None:
            raise ValueError(f"섹션을 찾을 수 없습니다: {section_name}")

        await self._writer.insert_ticket(
            file_path=todo_path,
            section_line_number=target_section.line_number,
            title=title,
        )

        # 재파싱 (라인번호 재계산됨)
        return await self.get_all_by_project(project_id)
