"""프로젝트 노트 관련 Pydantic 요청/응답 스키마"""

from pydantic import BaseModel, Field


class NoteSectorSchema(BaseModel):
    name: str = Field(..., min_length=1, title="섹터명")
    content: str = Field(default="", title="마크다운 본문")


class ProjectNoteResponse(BaseModel):
    project_id: str = Field(..., title="프로젝트 ID")
    sectors: list[NoteSectorSchema] = Field(
        default_factory=list, title="섹터 목록"
    )


class SaveNoteRequest(BaseModel):
    sectors: list[NoteSectorSchema] = Field(..., title="저장할 섹터 목록")


class PushNoteRequest(BaseModel):
    """푸시 요청 — 선택된 섹터만 내보내기"""
    sector_names: list[str] | None = Field(
        default=None, title="내보낼 섹터 이름 목록 (None이면 전체)"
    )


class PushNoteResponse(BaseModel):
    project_id: str = Field(..., title="프로젝트 ID")
    pushed_files: list[str] = Field(
        default_factory=list, title="내보낸 파일 경로 목록"
    )
