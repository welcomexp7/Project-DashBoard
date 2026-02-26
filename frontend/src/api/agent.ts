// ============================================================
// 에이전트 API 호출 함수
// ============================================================

import apiClient from "./client";
import type { AgentInvocation, AgentLaunchResult } from "@/src/types";

/** 에이전트 호출 (프로젝트 컨텍스트 + 프롬프트) */
export async function invokeAgent(
  projectId: string,
  projectPath: string,
  prompt: string
): Promise<AgentInvocation> {
  const { data } = await apiClient.post<{ invocation_id: string }>("/agent/invoke", {
    project_id: projectId,
    project_path: projectPath,
    prompt,
  });
  return {
    invocation_id: data.invocation_id,
    status: "running",
    output_lines: [],
  };
}

/** 에이전트 실행 상태 조회 */
export async function getAgentStatus(
  invocationId: string
): Promise<AgentInvocation> {
  const { data } = await apiClient.get<{
    status: string;
    output: string;
    error: string | null;
  }>(`/agent/status/${invocationId}`);

  const outputLines = data.output
    ? data.output.split("\n").filter((line) => line.length > 0)
    : [];

  return {
    invocation_id: invocationId,
    status: data.status as AgentInvocation["status"],
    output_lines: outputLines,
  };
}

/** 대화형 에이전트 세션 실행 (새 터미널 창) */
export async function launchInteractiveAgent(
  projectPath: string,
  prompt: string
): Promise<AgentLaunchResult> {
  const { data } = await apiClient.post<AgentLaunchResult>(
    "/agent/launch-interactive",
    { project_path: projectPath, prompt }
  );
  return data;
}
