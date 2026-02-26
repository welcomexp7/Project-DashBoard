"""애플리케이션 설정 — pydantic-settings 기반 환경 변수 관리"""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """전역 설정"""

    PROJECT_NAME: str = "Kanban Board"
    API_V1_STR: str = "/api"

    # pj.* 프로젝트가 위치하는 루트 디렉토리
    PROJECTS_ROOT: str = str(Path(__file__).resolve().parents[3])

    # 서버 포트
    PORT: int = 9999

    # CORS 허용 오리진 (로컬 전용)
    CORS_ORIGINS: str = "http://127.0.0.1:1111"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
