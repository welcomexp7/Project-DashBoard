"""에이전트 관련 Pydantic 요청/응답 스키마"""

from pydantic import BaseModel, Field


class InvokeAgentRequest(BaseModel):
    """Claude CLI 호출 요청"""

    project_path: str = Field(
        ...,
        title="프로젝트 경로",
        description="Claude CLI가 실행될 프로젝트 절대 경로",
    )
    prompt: str = Field(
        ...,
        title="프롬프트",
        description="Claude CLI에 전달할 프롬프트 텍스트",
    )


class InvokeAgentResponse(BaseModel):
    """Claude CLI 호출 응답"""

    invocation_id: str = Field(
        ...,
        title="호출 ID",
        description="비동기 실행 추적용 고유 ID",
    )


class AgentStatusResponse(BaseModel):
    """Claude CLI 실행 상태 응답"""

    status: str = Field(
        ...,
        title="실행 상태",
        description="running / completed / failed / not_found",
    )
    output: str = Field(default="", title="실행 출력", description="CLI stdout 결과")
    error: str | None = Field(default=None, title="에러 메시지", description="실패 시 에러 내용")


class LaunchInteractiveRequest(BaseModel):
    """대화형 에이전트 세션 실행 요청"""

    project_path: str = Field(
        ...,
        title="프로젝트 경로",
        description="Claude CLI가 실행될 프로젝트 절대 경로",
    )
    prompt: str = Field(
        ...,
        title="프롬프트",
        description="대화형 세션의 초기 프롬프트 (칸반 티켓 컨텍스트 포함)",
    )


class LaunchInteractiveResponse(BaseModel):
    """대화형 에이전트 세션 실행 응답"""

    launched: bool = Field(
        ...,
        title="실행 성공 여부",
        description="터미널 창이 성공적으로 열렸는지 여부",
    )
    pid: int | None = Field(
        default=None,
        title="프로세스 ID",
        description="실행된 Claude CLI 프로세스 PID",
    )
    error: str | None = Field(
        default=None,
        title="에러 메시지",
        description="실행 실패 시 에러 내용",
    )
