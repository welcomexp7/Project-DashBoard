"use client";

// SSE 구독 훅 — todo.md 변경 시 자동으로 데이터 리프레시
// 콜백을 ref로 관리하여 EventSource 재생성 방지 (무한 루프 방어)
import { useEffect, useRef } from "react";

const SSE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace("/api", "")}/api/events/stream`
  : "http://127.0.0.1:9999/api/events/stream";

interface UseSSEOptions {
  onTodoChanged?: (projectId: string) => void;
}

export function useSSE({ onTodoChanged }: UseSSEOptions) {
  // 콜백을 ref로 관리 → 의존성 배열에서 제외 → EventSource 재생성 방지
  const callbackRef = useRef(onTodoChanged);
  callbackRef.current = onTodoChanged;

  useEffect(() => {
    const es = new EventSource(SSE_URL);

    es.addEventListener("todo_changed", (event) => {
      try {
        const data = JSON.parse(event.data);
        callbackRef.current?.(data.project_id);
      } catch {
        // 파싱 실패 무시
      }
    });

    es.onerror = () => {
      // 자동 재연결 (EventSource 기본 동작)
    };

    return () => {
      es.close();
    };
  }, []); // 빈 의존성: 마운트 시 1회만 EventSource 생성
}
