"use client";

// ============================================================
// 에이전트 실행 패널 (듀얼 모드)
// interactive: 새 터미널 창에서 대화형 세션 실행 → 성공 알림
// one_shot: 기존 원샷 모드 (invoke + 3초 폴링)
// Aceternity UI: Glassmorphism + 상단 그라디언트 라인
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Bot,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { invokeAgent, getAgentStatus, launchInteractiveAgent } from "@/src/api/agent";
import type { AgentInvocation, AgentStatus, AgentMode, AgentLaunchResult } from "@/src/types";

interface AgentLogPanelProps {
  projectId: string;
  projectPath: string;
  prompt: string;
  mode: AgentMode;
  onClose: () => void;
  onComplete?: () => void;
  /** 에이전트가 성공적으로 시작되었을 때 호출 (티켓 자동 "진행중" 이동용) */
  onStarted?: () => void;
}

export default function AgentLogPanel({
  projectId,
  projectPath,
  prompt,
  mode,
  onClose,
  onComplete,
  onStarted,
}: AgentLogPanelProps) {
  // 원샷 모드 상태
  const [invocation, setInvocation] = useState<AgentInvocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 대화형 모드 상태
  const [launchResult, setLaunchResult] = useState<AgentLaunchResult | null>(null);
  const [copied, setCopied] = useState(false);

  // 무한 실행 방지: 실행 여부를 ref로 추적 (Strict Mode, HMR 리마운트에도 안전)
  const launchedRef = useRef(false);
  const invokedRef = useRef(false);
  // 콜백을 ref로 관리 → 의존성 배열에서 제외하여 리렌더 루프 차단
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;

  // ── 대화형 모드: 터미널 창 실행 (최대 1회) ──
  useEffect(() => {
    if (mode !== "interactive") return;
    if (launchedRef.current) return;
    launchedRef.current = true;

    async function launch() {
      try {
        const result = await launchInteractiveAgent(projectPath, prompt);
        setLaunchResult(result);
        // 에이전트 시작 성공 → 티켓 자동 "진행중" 이동
        // onStarted는 moveTicket(낙관적 업데이트)만 호출하므로 isLoading 사이클 없음 (안전)
        if (result.launched) onStartedRef.current?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "터미널 실행 실패");
      }
    }
    launch();
  }, [mode, projectPath, prompt]);

  // ── 원샷 모드: 기존 invoke + polling (최대 1회) ──
  useEffect(() => {
    if (mode !== "one_shot") return;
    if (invokedRef.current) return;
    invokedRef.current = true;

    async function invoke() {
      try {
        const result = await invokeAgent(projectId, projectPath, prompt);
        setInvocation(result);
        // invoke 성공 → 티켓 자동 "진행중" 이동
        if (result.invocation_id) onStartedRef.current?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "에이전트 호출 실패");
      }
    }
    invoke();
  }, [mode, projectId, projectPath, prompt]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [invocation?.output_lines]);

  useEffect(() => {
    if (mode !== "one_shot") return;
    if (!invocation?.invocation_id) return;
    if (invocation.status === "completed" || invocation.status === "failed")
      return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await getAgentStatus(invocation.invocation_id);
        setInvocation(status);
        if (status.status === "completed" || status.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (status.status === "completed") onCompleteRef.current?.();
        }
      } catch {
        /* 다음 폴링에서 재시도 */
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [mode, invocation?.invocation_id, invocation?.status]);

  // ── 명령어 복사 (대화형 모드) ──
  const handleCopyCommand = useCallback(() => {
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const cmd = `cd /d "${projectPath}" && claude "${escapedPrompt}"`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [projectPath, prompt]);

  const StatusIcon = useCallback(({ status }: { status: AgentStatus }) => {
    switch (status) {
      case "pending":
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-danger" />;
    }
  }, []);

  const statusLabel: Record<AgentStatus, string> = {
    pending: "대기 중...",
    running: "실행 중...",
    completed: "완료",
    failed: "실패",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{ position: "fixed" }}
      className="modal-gradient-line bottom-4 right-4 z-50 w-[420px] rounded-xl border border-white/[0.08] bg-slate-900/80 shadow-2xl backdrop-blur-2xl"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-2">
          {mode === "interactive" ? (
            <Terminal className="h-4 w-4 text-accent" />
          ) : (
            <Bot className="h-4 w-4 text-accent" />
          )}
          <span className="text-sm font-semibold">
            {mode === "interactive" ? "대화형 에이전트" : "에이전트"}
          </span>
          {/* 원샷 모드: 상태 표시 */}
          {mode === "one_shot" && invocation && (
            <div className="flex items-center gap-1.5">
              <StatusIcon status={invocation.status} />
              <span className="text-xs text-muted">
                {statusLabel[invocation.status]}
              </span>
            </div>
          )}
          {/* 대화형 모드: 상태 표시 */}
          {mode === "interactive" && launchResult?.launched && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-xs text-muted">실행됨</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 본문 */}
      <div className="max-h-64 overflow-y-auto p-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* ── 대화형 모드 본문 ── */}
        {mode === "interactive" && (
          <>
            {launchResult?.launched ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Terminal className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium">
                  에이전트 세션이 새 터미널 창에서 시작되었습니다
                </p>
                <p className="text-center text-xs text-muted">
                  터미널 창에서 직접 대화하세요.
                  <br />
                  프로젝트 CLAUDE.md가 자동 로드됩니다.
                </p>
                <button
                  onClick={handleCopyCommand}
                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      VSCode 터미널용 명령어 복사
                    </>
                  )}
                </button>
              </div>
            ) : launchResult && !launchResult.launched ? (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                {launchResult.error}
              </div>
            ) : !error ? (
              <div className="flex items-center justify-center py-6 text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-xs">터미널 창 실행 중...</span>
              </div>
            ) : null}
          </>
        )}

        {/* ── 원샷 모드 본문 ── */}
        {mode === "one_shot" && (
          <>
            <div className="mb-3 rounded-lg border border-white/[0.05] bg-black/40 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                프롬프트
              </p>
              <p className="mt-1 text-xs text-foreground">{prompt}</p>
            </div>

            {invocation?.output_lines && invocation.output_lines.length > 0 && (
              <div className="agent-log-output rounded-lg border border-white/[0.05] bg-black/40 p-3 text-foreground">
                {invocation.output_lines.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}

            {invocation &&
              (invocation.status === "pending" ||
                invocation.status === "running") &&
              (!invocation.output_lines ||
                invocation.output_lines.length === 0) && (
                <div className="flex items-center justify-center py-6 text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-xs">에이전트 출력 대기 중...</span>
                </div>
              )}
          </>
        )}
      </div>
    </motion.div>
  );
}
