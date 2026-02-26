"""프로젝트 서비스 — 프로젝트 조회/대시보드 집계 유스케이스"""

from typing import Optional

from backend.domain.interfaces import ProjectRepository
from backend.domain.project import Project


class ProjectService:
    """프로젝트 관련 유스케이스 오케스트레이션"""

    def __init__(self, repository: ProjectRepository) -> None:
        self._repo = repository

    async def scan_all(self) -> list[Project]:
        """모든 프로젝트 스캔"""
        return await self._repo.scan_all()

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """특정 프로젝트 조회"""
        return await self._repo.get_by_id(project_id)

    async def get_dashboard(self) -> dict:
        """
        대시보드 집계 데이터 반환.

        포함 항목:
        - total_projects: 전체 프로젝트 수
        - total_tickets: 전체 티켓 수
        - total_by_stage: 전체 스테이지별 티켓 수
        - projects: 프로젝트별 요약 목록
        """
        projects = await self._repo.scan_all()

        total_by_stage: dict[str, int] = {}
        total_tickets = 0

        for project in projects:
            for stage_name, count in project.ticket_count_by_stage.items():
                total_by_stage[stage_name] = (
                    total_by_stage.get(stage_name, 0) + count
                )
                total_tickets += count

        return {
            "total_projects": len(projects),
            "total_tickets": total_tickets,
            "total_by_stage": total_by_stage,
            "projects": projects,
        }
