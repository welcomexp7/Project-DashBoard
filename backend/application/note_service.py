"""노트 서비스 — 프로젝트 노트 조회/저장/푸쉬 유스케이스"""

from backend.domain.interfaces import NoteRepository
from backend.domain.note import NoteSector, ProjectNote


class NoteService:
    """프로젝트 노트 관련 유스케이스 오케스트레이션"""

    def __init__(self, repository: NoteRepository) -> None:
        self._repo = repository

    async def get_note(self, project_id: str) -> ProjectNote:
        """프로젝트 노트 조회"""
        return await self._repo.get_note(project_id)

    async def save_note(
        self, project_id: str, sectors: list[dict[str, str]]
    ) -> ProjectNote:
        """프로젝트 노트 전체 저장"""
        note = ProjectNote(
            project_id=project_id,
            sectors=[NoteSector(**s) for s in sectors],
        )
        return await self._repo.save_note(note)

    async def push_to_project(
        self, project_id: str, sector_names: list[str] | None = None
    ) -> list[str]:
        """대상 프로젝트에 섹터별 파일 내보내기"""
        return await self._repo.push_to_project(project_id, sector_names)
