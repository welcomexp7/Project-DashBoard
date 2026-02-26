"""파일 시스템 기반 프로젝트 저장소 — pj.* 폴더를 스캔하여 Project Entity 생성"""

from pathlib import Path
from typing import Optional

from backend.core.config import settings
from backend.domain.interfaces import ProjectRepository
from backend.domain.project import PROJECT_COLORS, Project
from backend.domain.ticket import KanbanStage
from backend.infrastructure.file_system.todo_parser import TodoParser


class FileProjectRepository(ProjectRepository):
    """PROJECTS_ROOT에서 pj.* 패턴 폴더를 탐색하는 저장소 구현체"""

    def __init__(self) -> None:
        self._parser = TodoParser()
        self._root = Path(settings.PROJECTS_ROOT)

    async def scan_all(self) -> list[Project]:
        """pj.* 폴더를 glob으로 스캔하여 모든 프로젝트 반환"""
        projects: list[Project] = []
        # pj.* 패턴 폴더를 정렬하여 색상 인덱스 안정화
        folders = sorted(self._root.glob("pj.*"))

        for idx, folder in enumerate(folders):
            if not folder.is_dir():
                continue

            todo_path = folder / "todo.md"
            if not todo_path.exists():
                continue

            project_id = folder.name
            result = self._parser.parse(str(todo_path), project_id)

            # 스테이지별 티켓 수 집계
            count_by_stage = self._count_by_stage(result.tickets)

            project = Project(
                project_id=project_id,
                name=result.project_title or project_id,
                path=str(folder),
                todo_file_path=str(todo_path),
                sections=result.sections,
                ticket_count_by_stage=count_by_stage,
                color=PROJECT_COLORS[idx % len(PROJECT_COLORS)],
            )
            projects.append(project)

        return projects

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """특정 프로젝트 ID로 조회"""
        all_projects = await self.scan_all()
        for project in all_projects:
            if project.project_id == project_id:
                return project
        return None

    @staticmethod
    def _count_by_stage(tickets: list) -> dict[str, int]:
        """스테이지별 티켓 수 집계 (모든 스테이지 키 포함)"""
        counts: dict[str, int] = {stage.value: 0 for stage in KanbanStage}
        for ticket in tickets:
            counts[ticket.stage.value] = counts.get(ticket.stage.value, 0) + 1
        return counts
