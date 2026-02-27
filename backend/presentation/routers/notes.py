"""노트 라우터 — 프로젝트 노트 조회/저장/푸쉬 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException

from backend.application.note_service import NoteService
from backend.infrastructure.repositories.file_note_repository import (
    FileNoteRepository,
)
from backend.presentation.schemas.note_schemas import (
    ProjectNoteResponse,
    PushNoteRequest,
    PushNoteResponse,
    SaveNoteRequest,
)

router = APIRouter(
    prefix="/projects/{project_id}/notes", tags=["노트"]
)


def get_note_service() -> NoteService:
    return NoteService(FileNoteRepository())


@router.get("", response_model=ProjectNoteResponse, summary="프로젝트 노트 조회")
async def get_note(
    project_id: str,
    service: NoteService = Depends(get_note_service),
) -> ProjectNoteResponse:
    note = await service.get_note(project_id)
    return ProjectNoteResponse(**note.model_dump())


@router.put("", response_model=ProjectNoteResponse, summary="프로젝트 노트 저장")
async def save_note(
    project_id: str,
    body: SaveNoteRequest,
    service: NoteService = Depends(get_note_service),
) -> ProjectNoteResponse:
    note = await service.save_note(
        project_id, [s.model_dump() for s in body.sectors]
    )
    return ProjectNoteResponse(**note.model_dump())


@router.post(
    "/push", response_model=PushNoteResponse, summary="프로젝트에 노트 내보내기"
)
async def push_note(
    project_id: str,
    body: PushNoteRequest | None = None,
    service: NoteService = Depends(get_note_service),
) -> PushNoteResponse:
    try:
        sector_names = body.sector_names if body else None
        pushed = await service.push_to_project(project_id, sector_names)
        return PushNoteResponse(project_id=project_id, pushed_files=pushed)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
