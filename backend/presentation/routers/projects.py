"""프로젝트 라우터 — 프로젝트 목록/상세/대시보드 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException

from backend.application.project_service import ProjectService
from backend.infrastructure.repositories.file_project_repository import (
    FileProjectRepository,
)
from backend.presentation.schemas.project_schemas import (
    DashboardResponse,
    ProjectResponse,
)

router = APIRouter(prefix="/projects", tags=["프로젝트"])


def get_project_service() -> ProjectService:
    """DI 팩토리: ProjectService 인스턴스 생성"""
    repository = FileProjectRepository()
    return ProjectService(repository)


@router.get(
    "",
    response_model=list[ProjectResponse],
    summary="전체 프로젝트 목록",
)
async def list_projects(
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    """pj.* 폴더를 스캔하여 모든 프로젝트 반환"""
    try:
        projects = await service.scan_all()
        return [ProjectResponse.model_validate(p.model_dump()) for p in projects]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="대시보드 집계 데이터",
)
async def get_dashboard(
    service: ProjectService = Depends(get_project_service),
) -> DashboardResponse:
    """모든 프로젝트의 스테이지별 집계 데이터 반환"""
    try:
        data = await service.get_dashboard()
        # projects 리스트를 dict로 변환하여 Pydantic 검증 통과
        data["projects"] = [p.model_dump() for p in data["projects"]]
        return DashboardResponse.model_validate(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="프로젝트 상세 조회",
)
async def get_project(
    project_id: str,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """특정 프로젝트 상세 정보 반환"""
    try:
        project = await service.get_by_id(project_id)
        if project is None:
            raise HTTPException(
                status_code=404,
                detail=f"프로젝트를 찾을 수 없습니다: {project_id}",
            )
        return ProjectResponse.model_validate(project.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
