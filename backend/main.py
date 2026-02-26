"""FastAPI 진입점 — 앱 생성, CORS 설정, 라우터 등록, SSE 파일 감시"""

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from backend.core.config import settings
from backend.infrastructure.file_system.file_watcher import TodoFileWatcher
from backend.presentation.routers import agent, notes, projects, tickets

# 파일 감시자 (앱 수명 동안 유지)
watcher = TodoFileWatcher(settings.PROJECTS_ROOT)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작 시 파일 감시 시작, 종료 시 정리"""
    await watcher.start()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS 미들웨어 (127.0.0.1:1111)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(projects.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(notes.router, prefix="/api")


@app.get("/api/health", tags=["헬스체크"])
async def health_check() -> dict:
    """서버 상태 확인"""
    return {"status": "ok", "project": settings.PROJECT_NAME}


@app.get("/api/events/stream", tags=["실시간"])
async def event_stream(request: Request):
    """SSE 엔드포인트 — todo.md 파일 변경 시 실시간 이벤트 전송"""

    async def generate():
        queue = watcher.subscribe()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {"event": "todo_changed", "data": json.dumps(event)}
                except asyncio.TimeoutError:
                    # 30초마다 keepalive 핑
                    yield {"event": "ping", "data": "keepalive"}
        finally:
            watcher.unsubscribe(queue)

    return EventSourceResponse(generate())
