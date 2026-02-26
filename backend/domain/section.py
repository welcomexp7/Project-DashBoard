"""섹션 Value Object — todo.md의 ## 헤더에 대응하는 티켓 카테고리"""

from pydantic import BaseModel, ConfigDict, Field


class Section(BaseModel):
    """todo.md의 ## 헤더에 대응하는 섹션"""

    model_config = ConfigDict(frozen=True)

    name: str = Field(..., description="섹션 이름 (## 이후 텍스트)")
    line_number: int = Field(..., description="todo.md 원본 라인 번호")
