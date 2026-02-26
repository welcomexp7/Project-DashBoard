"""티켓 서비스 — 티켓 조회/스테이지 이동/삭제/에픽 관리 유스케이스"""

from typing import Optional

from backend.domain.interfaces import TicketRepository
from backend.domain.ticket import KanbanStage, Ticket, TicketType


class TicketService:
    """티켓 관련 유스케이스 오케스트레이션"""

    def __init__(self, repository: TicketRepository) -> None:
        self._repo = repository

    async def get_all(self, project_id: str) -> list[Ticket]:
        """특정 프로젝트의 전체 티켓 조회"""
        return await self._repo.get_all_by_project(project_id)

    async def get_by_id(
        self, project_id: str, ticket_id: str
    ) -> Optional[Ticket]:
        """특정 티켓 조회"""
        return await self._repo.get_by_id(project_id, ticket_id)

    async def move_ticket(
        self, project_id: str, ticket_id: str, new_stage: KanbanStage
    ) -> Ticket:
        """티켓 스테이지 변경 후 최신 Ticket 반환"""
        return await self._repo.update_stage(project_id, ticket_id, new_stage)

    async def delete_ticket(
        self,
        project_id: str,
        ticket_id: str,
        cascade: bool = False,
    ) -> list[Ticket]:
        """
        티켓 삭제.

        cascade=True: 에픽 삭제 시 자식도 함께 삭제.
        cascade=False: 에픽 삭제 시 자식은 독립 티켓으로 자동 승격 (들여쓰기만 잔존).
        """
        ticket = await self._repo.get_by_id(project_id, ticket_id)
        if ticket is None:
            raise ValueError(f"티켓을 찾을 수 없습니다: {ticket_id}")

        if ticket.ticket_type == TicketType.EPIC and cascade:
            # 에픽 + 모든 자식 함께 삭제
            ids_to_delete = [ticket_id] + ticket.children_ids
            return await self._repo.delete_tickets(project_id, ids_to_delete)

        # 단일 삭제 (에픽이어도 자식은 보존 → 재파싱 시 자동 승격)
        return await self._repo.delete_ticket(project_id, ticket_id)

    async def delete_tickets(
        self,
        project_id: str,
        ticket_ids: list[str],
    ) -> list[Ticket]:
        """복수 티켓 일괄 삭제"""
        return await self._repo.delete_tickets(project_id, ticket_ids)

    async def create_ticket(
        self,
        project_id: str,
        section_name: str,
        title: str,
    ) -> list[Ticket]:
        """
        티켓 생성 유스케이스.

        title 공백 제거 후 유효성 검증 → Repository에 위임.
        """
        title = title.strip()
        if not title:
            raise ValueError("티켓 제목이 비어있습니다")
        return await self._repo.create_ticket(project_id, section_name, title)

    async def create_child_ticket(
        self,
        project_id: str,
        parent_ticket_id: str,
        title: str,
    ) -> list[Ticket]:
        """
        부모 티켓 아래 자식 티켓 생성.

        title 공백 제거 후 유효성 검증 → Repository에 위임.
        """
        title = title.strip()
        if not title:
            raise ValueError("티켓 제목이 비어있습니다")
        return await self._repo.create_child_ticket(
            project_id, parent_ticket_id, title
        )

    async def move_epic(
        self,
        project_id: str,
        epic_id: str,
        new_stage: KanbanStage,
        include_children: bool = True,
    ) -> list[Ticket]:
        """
        에픽 스테이지 이동 (자식 선택적 동반).

        include_children=True: 에픽 + 모든 자식 동시 이동.
        """
        epic = await self._repo.get_by_id(project_id, epic_id)
        if epic is None:
            raise ValueError(f"에픽을 찾을 수 없습니다: {epic_id}")

        ids_to_move = [epic_id]
        if include_children and epic.children_ids:
            ids_to_move.extend(epic.children_ids)

        results: list[Ticket] = []
        for tid in ids_to_move:
            result = await self._repo.update_stage(project_id, tid, new_stage)
            results.append(result)
        return results
