"""에이전트 라우터 — Claude CLI 호출/상태 조회 엔드포인트"""

from fastapi import APIRouter, Depends, HTTPException

from backend.application.agent_service import AgentService
from backend.infrastructure.external.claude_cli_adapter import ClaudeCliAdapter
from backend.presentation.schemas.agent_schemas import (
    AgentStatusResponse,
    InvokeAgentRequest,
    InvokeAgentResponse,
    LaunchInteractiveRequest,
    LaunchInteractiveResponse,
)

router = APIRouter(prefix="/agent", tags=["에이전트"])

# Claude CLI 어댑터 싱글톤 (상태 보존을 위해 모듈 레벨에서 생성)
_cli_adapter = ClaudeCliAdapter()


def get_agent_service() -> AgentService:
    """DI 팩토리: AgentService 인스턴스 생성"""
    return AgentService(_cli_adapter)


@router.post(
    "/invoke",
    response_model=InvokeAgentResponse,
    summary="Claude CLI 호출",
)
async def invoke_agent(
    body: InvokeAgentRequest,
    service: AgentService = Depends(get_agent_service),
) -> InvokeAgentResponse:
    """Claude CLI를 비동기로 호출하고 추적용 invocation_id 반환"""
    try:
        invocation_id = await service.invoke(body.project_path, body.prompt)
        return InvokeAgentResponse(invocation_id=invocation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/status/{invocation_id}",
    response_model=AgentStatusResponse,
    summary="실행 상태 조회",
)
async def get_agent_status(
    invocation_id: str,
    service: AgentService = Depends(get_agent_service),
) -> AgentStatusResponse:
    """Claude CLI 실행 상태 조회 (running / completed / failed / not_found)"""
    try:
        status = await service.get_status(invocation_id)
        return AgentStatusResponse.model_validate(status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/launch-interactive",
    response_model=LaunchInteractiveResponse,
    summary="대화형 에이전트 세션 실행 (새 터미널 창)",
)
async def launch_interactive_agent(
    body: LaunchInteractiveRequest,
    service: AgentService = Depends(get_agent_service),
) -> LaunchInteractiveResponse:
    """새 Windows 콘솔 창에서 Claude CLI 대화형 세션을 실행. CLAUDE.md가 자동 로드됨."""
    try:
        result = await service.launch_interactive(body.project_path, body.prompt)
        return LaunchInteractiveResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
