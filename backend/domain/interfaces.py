"""Port 인터페이스 — 외부 의존성 격리를 위한 ABC 추상 클래스"""

from abc import ABC, abstractmethod
from typing import Optional

from backend.domain.note import ProjectNote
from backend.domain.project import Project
from backend.domain.ticket import KanbanStage, Ticket


class ProjectRepository(ABC):
    """프로젝트 저장소 인터페이스"""

    @abstractmethod
    async def scan_all(self) -> list[Project]:
        """pj.* 폴더를 스캔하여 모든 프로젝트 반환"""
        pass

    @abstractmethod
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """특정 프로젝트 조회"""
        pass


class TicketRepository(ABC):
    """티켓 저장소 인터페이스"""

    @abstractmethod
    async def get_all_by_project(self, project_id: str) -> list[Ticket]:
        """특정 프로젝트의 모든 티켓 반환"""
        pass

    @abstractmethod
    async def get_by_id(
        self, project_id: str, ticket_id: str
    ) -> Optional[Ticket]:
        """특정 티켓 조회"""
        pass

    @abstractmethod
    async def update_stage(
        self, project_id: str, ticket_id: str, new_stage: KanbanStage
    ) -> Ticket:
        """티켓 스테이지 변경 (todo.md 마커 교체)"""
        pass

    @abstractmethod
    async def delete_ticket(
        self, project_id: str, ticket_id: str
    ) -> list[Ticket]:
        """티켓 삭제 후 전체 티켓 목록 반환 (라인번호 재계산)"""
        pass

    @abstractmethod
    async def delete_tickets(
        self, project_id: str, ticket_ids: list[str]
    ) -> list[Ticket]:
        """복수 티켓 일괄 삭제 후 전체 티켓 목록 반환"""
        pass

    @abstractmethod
    async def create_ticket(
        self, project_id: str, section_name: str, title: str
    ) -> list[Ticket]:
        """티켓 생성 후 전체 티켓 목록 반환 (라인번호 재계산)"""
        pass

    @abstractmethod
    async def create_child_ticket(
        self, project_id: str, parent_ticket_id: str, title: str
    ) -> list[Ticket]:
        """부모 티켓 아래 자식 생성 후 전체 목록 반환"""
        pass


class NoteRepository(ABC):
    """프로젝트 노트 저장소 인터페이스"""

    @abstractmethod
    async def get_note(self, project_id: str) -> ProjectNote:
        """프로젝트 노트 조회 (없으면 기본 섹터로 생성)"""
        pass

    @abstractmethod
    async def save_note(self, note: ProjectNote) -> ProjectNote:
        """프로젝트 노트 저장 (중앙 저장소)"""
        pass

    @abstractmethod
    async def push_to_project(self, project_id: str) -> list[str]:
        """대상 프로젝트 루트에 섹터별 md 파일로 내보내기"""
        pass


class AgentAdapter(ABC):
    """Claude Code CLI 어댑터 인터페이스"""

    @abstractmethod
    async def invoke(self, project_path: str, prompt: str) -> str:
        """원샷 모드: CLI 호출 후 invocation_id 반환"""
        pass

    @abstractmethod
    async def get_status(self, invocation_id: str) -> dict:
        """실행 상태 조회"""
        pass

    @abstractmethod
    async def launch_interactive(self, project_path: str, prompt: str) -> dict:
        """대화형 모드: 새 터미널 창에서 Claude CLI 인터랙티브 세션 실행"""
        pass
