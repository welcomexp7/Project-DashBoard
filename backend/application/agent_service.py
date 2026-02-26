"""에이전트 서비스 — Claude CLI 호출/상태 조회 유스케이스"""

from backend.domain.interfaces import AgentAdapter


class AgentService:
    """Claude CLI 에이전트 호출 유스케이스 오케스트레이션"""

    def __init__(self, adapter: AgentAdapter) -> None:
        self._adapter = adapter

    async def invoke(self, project_path: str, prompt: str) -> str:
        """Claude CLI 호출 후 invocation_id 반환"""
        return await self._adapter.invoke(project_path, prompt)

    async def get_status(self, invocation_id: str) -> dict:
        """실행 상태 조회"""
        return await self._adapter.get_status(invocation_id)

    async def launch_interactive(self, project_path: str, prompt: str) -> dict:
        """대화형 에이전트 세션을 새 터미널 창에서 실행"""
        return await self._adapter.launch_interactive(project_path, prompt)
