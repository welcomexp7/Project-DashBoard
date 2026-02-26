"""티켓 라우터 — 프로젝트별 티켓 조회/스테이지 이동/삭제/에픽 관리 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.application.ticket_service import TicketService
from backend.domain.ticket import KanbanStage
from backend.infrastructure.repositories.file_ticket_repository import (
    FileTicketRepository,
)
from backend.presentation.schemas.ticket_schemas import (
    BatchDeleteRequest,
    CreateChildTicketRequest,
    CreateTicketRequest,
    MoveEpicRequest,
    MoveTicketRequest,
    ProjectTicketsResponse,
    TicketResponse,
    TicketsByStageResponse,
)

router = APIRouter(prefix="/projects/{project_id}/tickets", tags=["티켓"])


def get_ticket_service() -> TicketService:
    """DI 팩토리: TicketService 인스턴스 생성"""
    repository = FileTicketRepository()
    return TicketService(repository)


def _build_project_tickets_response(
    project_id: str, tickets: list,
) -> ProjectTicketsResponse:
    """티켓 목록을 ProjectTicketsResponse로 변환 (중복 로직 제거)"""
    ticket_responses = [
        TicketResponse.model_validate(t.model_dump()) for t in tickets
    ]
    by_stage: list[TicketsByStageResponse] = []
    for stage in KanbanStage:
        stage_tickets = [t for t in ticket_responses if t.stage == stage]
        by_stage.append(
            TicketsByStageResponse(stage=stage, tickets=stage_tickets)
        )
    return ProjectTicketsResponse(
        project_id=project_id,
        total=len(ticket_responses),
        tickets=ticket_responses,
        by_stage=by_stage,
    )


@router.get(
    "",
    response_model=ProjectTicketsResponse,
    summary="프로젝트 전체 티켓 조회",
)
async def list_tickets(
    project_id: str,
    service: TicketService = Depends(get_ticket_service),
) -> ProjectTicketsResponse:
    """특정 프로젝트의 모든 티켓을 스테이지별로 그룹핑하여 반환"""
    try:
        tickets = await service.get_all(project_id)
        return _build_project_tickets_response(project_id, tickets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "",
    response_model=ProjectTicketsResponse,
    summary="티켓 생성",
    status_code=201,
)
async def create_ticket(
    project_id: str,
    body: CreateTicketRequest,
    service: TicketService = Depends(get_ticket_service),
) -> ProjectTicketsResponse:
    """새 티켓을 지정 섹션에 추가 후 전체 티켓 목록 반환"""
    try:
        tickets = await service.create_ticket(
            project_id, body.section_name, body.title
        )
        return _build_project_tickets_response(project_id, tickets)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/{ticket_id}/stage",
    response_model=TicketResponse,
    summary="티켓 스테이지 이동",
)
async def move_ticket_stage(
    project_id: str,
    ticket_id: str,
    body: MoveTicketRequest,
    service: TicketService = Depends(get_ticket_service),
) -> TicketResponse:
    """티켓의 칸반 스테이지를 변경하고 최신 상태 반환"""
    try:
        ticket = await service.move_ticket(project_id, ticket_id, body.new_stage)
        return TicketResponse.model_validate(ticket.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/{ticket_id}",
    response_model=ProjectTicketsResponse,
    summary="티켓 삭제",
)
async def delete_ticket(
    project_id: str,
    ticket_id: str,
    cascade: bool = Query(False, description="에픽 삭제 시 자식도 함께 삭제"),
    service: TicketService = Depends(get_ticket_service),
) -> ProjectTicketsResponse:
    """티켓 삭제 후 전체 티켓 목록 반환 (라인번호 갱신)"""
    try:
        tickets = await service.delete_ticket(project_id, ticket_id, cascade)
        return _build_project_tickets_response(project_id, tickets)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/batch-delete",
    response_model=ProjectTicketsResponse,
    summary="복수 티켓 일괄 삭제",
)
async def batch_delete_tickets(
    project_id: str,
    body: BatchDeleteRequest,
    service: TicketService = Depends(get_ticket_service),
) -> ProjectTicketsResponse:
    """선택된 티켓들 일괄 삭제 후 전체 티켓 목록 반환"""
    try:
        tickets = await service.delete_tickets(project_id, body.ticket_ids)
        return _build_project_tickets_response(project_id, tickets)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{ticket_id}/children",
    response_model=ProjectTicketsResponse,
    summary="하위 티켓 생성",
    status_code=201,
)
async def create_child_ticket(
    project_id: str,
    ticket_id: str,
    body: CreateChildTicketRequest,
    service: TicketService = Depends(get_ticket_service),
) -> ProjectTicketsResponse:
    """부모 티켓 아래에 자식 티켓 추가 후 전체 티켓 목록 반환"""
    try:
        tickets = await service.create_child_ticket(
            project_id, ticket_id, body.title
        )
        return _build_project_tickets_response(project_id, tickets)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/{ticket_id}/move-epic",
    response_model=list[TicketResponse],
    summary="에픽+자식 일괄 스테이지 이동",
)
async def move_epic_stage(
    project_id: str,
    ticket_id: str,
    body: MoveEpicRequest,
    service: TicketService = Depends(get_ticket_service),
) -> list[TicketResponse]:
    """에픽과 자식 티켓들의 스테이지를 일괄 변경"""
    try:
        tickets = await service.move_epic(
            project_id, ticket_id, body.new_stage, body.include_children
        )
        return [TicketResponse.model_validate(t.model_dump()) for t in tickets]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
