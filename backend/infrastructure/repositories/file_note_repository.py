"""파일시스템 기반 프로젝트 노트 저장소 — pj.0/notes/{project_id}.md"""

import asyncio
import re
from pathlib import Path

from backend.core.config import settings
from backend.domain.interfaces import NoteRepository
from backend.domain.note import NoteSector, ProjectNote

_note_lock = asyncio.Lock()
SECTION_RE = re.compile(r"^##\s+(.+)$")
DEFAULT_SECTORS = ["개요", "관련 자료", "일정"]

# 파일명에 사용 불가한 문자 제거
_SANITIZE_RE = re.compile(r'[<>:"/\\|?*]')


class FileNoteRepository(NoteRepository):
    """중앙 저장소(pj.0/notes/)에 프로젝트 노트를 md 파일로 관리"""

    def __init__(self) -> None:
        self._root = Path(settings.PROJECTS_ROOT)
        self._notes_dir = self._root / "pj.0" / "notes"

    def _note_path(self, project_id: str) -> Path:
        return self._notes_dir / f"{project_id}.md"

    async def get_note(self, project_id: str) -> ProjectNote:
        path = self._note_path(project_id)
        if not path.exists():
            return ProjectNote(
                project_id=project_id,
                sectors=[NoteSector(name=s, content="") for s in DEFAULT_SECTORS],
            )
        text = path.read_text(encoding="utf-8")
        sectors = self._parse_sectors(text)
        return ProjectNote(project_id=project_id, sectors=sectors)

    async def save_note(self, note: ProjectNote) -> ProjectNote:
        async with _note_lock:
            self._notes_dir.mkdir(parents=True, exist_ok=True)
            path = self._note_path(note.project_id)
            content = self._serialize(note.sectors)
            path.write_text(content, encoding="utf-8")
        return note

    async def push_to_project(self, project_id: str) -> list[str]:
        note = await self.get_note(project_id)
        target_dir = self._root / project_id
        if not target_dir.exists():
            raise ValueError(f"대상 프로젝트 디렉토리가 없습니다: {project_id}")
        pushed: list[str] = []
        for sector in note.sectors:
            safe_name = _SANITIZE_RE.sub("_", sector.name)
            file_path = target_dir / f"notes-{safe_name}.md"
            file_path.write_text(sector.content, encoding="utf-8")
            pushed.append(str(file_path))
        return pushed

    @staticmethod
    def _parse_sectors(text: str) -> list[NoteSector]:
        """## 헤더 기반 섹터 파싱"""
        lines = text.splitlines()
        sectors: list[NoteSector] = []
        current_name: str | None = None
        current_lines: list[str] = []

        for line in lines:
            m = SECTION_RE.match(line)
            if m:
                if current_name is not None:
                    sectors.append(
                        NoteSector(
                            name=current_name,
                            content="\n".join(current_lines).strip(),
                        )
                    )
                current_name = m.group(1).strip()
                current_lines = []
            elif current_name is not None:
                current_lines.append(line)

        if current_name is not None:
            sectors.append(
                NoteSector(
                    name=current_name,
                    content="\n".join(current_lines).strip(),
                )
            )
        return sectors

    @staticmethod
    def _serialize(sectors: list[NoteSector]) -> str:
        parts: list[str] = []
        for sector in sectors:
            parts.append(f"## {sector.name}\n{sector.content}\n")
        return "\n".join(parts)
