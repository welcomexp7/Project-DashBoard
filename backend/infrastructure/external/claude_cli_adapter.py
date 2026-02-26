"""Claude CLI 어댑터 — asyncio 서브프로세스로 claude 명령어 비동기 실행"""

import asyncio
import os
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

from backend.domain.interfaces import AgentAdapter


def _find_claude_cli() -> str:
    """
    claude CLI 실행 파일 경로를 탐색.

    탐색 순서:
    1. 시스템 PATH (이미 설치된 경우)
    2. VS Code 확장 번들 (anthropic.claude-code 확장의 native-binary)
    """
    # 1) PATH에서 찾기
    import shutil
    path = shutil.which("claude")
    if path:
        return path

    # 2) VS Code 확장 디렉토리에서 탐색
    if sys.platform == "win32":
        vscode_ext_dir = Path.home() / ".vscode" / "extensions"
        if vscode_ext_dir.exists():
            # 가장 최신 버전의 확장 사용 (역순 정렬)
            candidates = sorted(
                vscode_ext_dir.glob("anthropic.claude-code-*"),
                reverse=True,
            )
            for ext_dir in candidates:
                binary = ext_dir / "resources" / "native-binary" / "claude.exe"
                if binary.exists():
                    return str(binary)

    return "claude"  # 폴백: 그냥 claude (에러는 호출 시점에서 처리)


def _clean_env() -> dict[str, str]:
    """Claude Code 중첩 세션 방지 환경변수를 제거한 깨끗한 env 반환."""
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    return env


class ClaudeCliAdapter(AgentAdapter):
    """claude --print CLI를 비동기 서브프로세스로 호출하는 어댑터"""

    def __init__(self) -> None:
        # invocation_id -> 실행 상태 매핑
        self._invocations: dict[str, dict] = {}
        self._claude_path: str = _find_claude_cli()
        # 방어: 프로젝트별 마지막 interactive launch 시각 (무한 실행 방지)
        self._last_launch: dict[str, float] = {}
        self._launch_cooldown: float = 30.0  # 30초 쿨다운

    async def invoke(self, project_path: str, prompt: str) -> str:
        """
        Claude CLI를 비동기로 호출하고 invocation_id를 즉시 반환.

        호출 형태: claude -p "프롬프트" --dangerously-skip-permissions (도구 자동 승인, 비대화형)
        """
        invocation_id = str(uuid4())
        self._invocations[invocation_id] = {
            "status": "running",
            "output": "",
            "error": None,
        }

        # 백그라운드 태스크로 CLI 실행
        asyncio.create_task(
            self._run_cli(invocation_id, project_path, prompt)
        )
        return invocation_id

    async def get_status(self, invocation_id: str) -> dict:
        """실행 상태 조회 (running / completed / failed)"""
        if invocation_id not in self._invocations:
            return {"status": "not_found", "output": "", "error": None}
        return self._invocations[invocation_id]

    async def _run_cli(
        self, invocation_id: str, project_path: str, prompt: str
    ) -> None:
        """실제 CLI 서브프로세스 실행 및 결과 수집"""
        try:
            process = await asyncio.create_subprocess_exec(
                self._claude_path,
                "-p",
                prompt,
                "--dangerously-skip-permissions",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path,
                env=_clean_env(),
            )
            output = await self._collect_output(process)

            self._invocations[invocation_id] = {
                "status": "completed",
                "output": output,
                "error": None,
            }
        except Exception as e:
            self._invocations[invocation_id] = {
                "status": "failed",
                "output": "",
                "error": str(e),
            }

    async def launch_interactive(self, project_path: str, prompt: str) -> dict:
        """
        새 Windows 콘솔 창에서 Claude CLI 대화형 세션 실행.

        실행 형태: claude "프롬프트" (--print 없음, cwd=프로젝트경로)
        프로젝트 디렉토리에서 실행하므로 CLAUDE.md가 자동 로드됨.
        쿨다운: 동일 프로젝트에 대해 30초 내 중복 실행 차단 (무한 루프 방어).
        """
        # 쿨다운 체크 — 프론트엔드 버그 시에도 무한 CLI 생성 방지
        now = time.monotonic()
        last = self._last_launch.get(project_path, 0.0)
        if now - last < self._launch_cooldown:
            remaining = int(self._launch_cooldown - (now - last))
            return {
                "launched": False,
                "pid": None,
                "error": f"쿨다운 중입니다. {remaining}초 후 다시 시도하세요.",
            }
        self._last_launch[project_path] = now

        try:
            kwargs: dict = {"cwd": project_path, "env": _clean_env()}
            if sys.platform == "win32":
                kwargs["creationflags"] = subprocess.CREATE_NEW_CONSOLE
            process = subprocess.Popen([self._claude_path, prompt], **kwargs)
            return {"launched": True, "pid": process.pid, "error": None}
        except FileNotFoundError:
            return {
                "launched": False,
                "pid": None,
                "error": "Claude CLI를 찾을 수 없습니다. PATH에 'claude' 명령어가 등록되어 있는지 확인하세요.",
            }
        except OSError as e:
            return {
                "launched": False,
                "pid": None,
                "error": f"터미널 창 실행 실패: {e}",
            }

    @staticmethod
    async def _collect_output(process: asyncio.subprocess.Process) -> str:
        """서브프로세스 stdout을 비동기로 수집"""
        stdout, stderr = await process.communicate()
        if process.returncode != 0 and stderr:
            raise RuntimeError(
                f"CLI 실행 실패 (코드 {process.returncode}): "
                f"{stderr.decode('utf-8', errors='replace')}"
            )
        return stdout.decode("utf-8", errors="replace") if stdout else ""
