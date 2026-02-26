"""파일 감시 — todo.md 변경을 감지하여 SSE 구독자에게 알림"""

import asyncio
import logging
from pathlib import Path

from watchfiles import awatch, Change

logger = logging.getLogger(__name__)


class TodoFileWatcher:
    """pj.*/todo.md 파일 변경을 감지하는 비동기 감시자"""

    def __init__(self, base_dir: str) -> None:
        self._base_dir = Path(base_dir)
        self._subscribers: list[asyncio.Queue] = []
        self._task: asyncio.Task | None = None

    def subscribe(self) -> asyncio.Queue:
        """SSE 구독자 큐 등록"""
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        """SSE 구독 해제"""
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def start(self) -> None:
        """백그라운드 태스크로 파일 감시 시작"""
        if self._task is None:
            self._task = asyncio.create_task(self._watch())

    async def _watch(self) -> None:
        """watchfiles로 pj.* 디렉토리 내 todo.md 변경 감지"""
        watch_paths: list[str] = []
        for pj_dir in sorted(self._base_dir.glob("pj.*")):
            if pj_dir.is_dir():
                watch_paths.append(str(pj_dir))

        if not watch_paths:
            logger.warning("감시할 pj.* 디렉토리가 없음")
            return

        try:
            async for changes in awatch(*watch_paths):
                for change_type, changed_path in changes:
                    if Path(changed_path).name == "todo.md":
                        project_id = Path(changed_path).parent.name
                        event = {
                            "type": "todo_changed",
                            "project_id": project_id,
                            "change": change_type.name,
                        }
                        for queue in self._subscribers:
                            await queue.put(event)
        except asyncio.CancelledError:
            logger.info("파일 감시 종료")
        except Exception as e:
            logger.error(f"파일 감시 오류: {e}")
