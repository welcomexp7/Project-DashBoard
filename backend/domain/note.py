"""프로젝트 노트 Entity + 섹터 Value Object"""

from pydantic import BaseModel, ConfigDict, Field


class NoteSector(BaseModel):
    """노트 내 섹터 (VO) — ## 헤더에 대응"""

    model_config = ConfigDict(frozen=True)

    name: str = Field(..., description="섹터 이름")
    content: str = Field(default="", description="마크다운 본문")


class ProjectNote(BaseModel):
    """프로젝트 노트 Entity — pj.0/notes/{project_id}.md에 대응"""

    project_id: str = Field(..., description="프로젝트 ID (예: pj.1)")
    sectors: list[NoteSector] = Field(
        default_factory=list, description="섹터 목록"
    )
