// ============================================================
// 에이전트 프롬프트 빌더 유틸리티
// 칸반 티켓 컨텍스트를 포함한 구조화된 프롬프트 생성
// 대화형 / 원샷 모드 모두에서 사용
// ============================================================

import type { TicketResponse, AgentMode } from "@/src/types";

/**
 * 칸반 티켓 컨텍스트를 포함한 에이전트 프롬프트 생성.
 * 원샷 모드: PM 사전 승인 지시를 삽입하여 컨펌 대기 없이 즉시 이행.
 */
export function buildAgentPrompt(
  tickets: TicketResponse[],
  additionalPrompt?: string,
  mode?: AgentMode
): string {
  const isMulti = tickets.length > 1;

  let prompt = `[칸반보드 작업 지시]\n`;

  if (isMulti) {
    prompt += `## 대상 티켓 (${tickets.length}개)\n`;
    tickets.forEach((t, i) => {
      prompt += `${i + 1}. 제목: ${t.title}\n   - 섹션: ${t.section.name}\n   - 현재 스테이지: ${t.stage}\n`;
    });
  } else {
    const t = tickets[0];
    prompt += `## 대상 티켓\n`;
    prompt += `- 제목: ${t.title}\n`;
    prompt += `- 섹션: ${t.section.name}\n`;
    prompt += `- 현재 스테이지: ${t.stage}\n`;
    if (t.ticket_type === "epic" && t.children_ids.length > 0) {
      prompt += `- 유형: 에픽 (하위 ${t.children_ids.length}개 티켓 포함)\n`;
      prompt += `\n## 하위 티켓\n`;
      // 멀티 티켓 배열에서 자식 정보 찾기 (있으면 상세, 없으면 ID만)
      t.children_ids.forEach((childId, i) => {
        const child = tickets.find((c) => c.ticket_id === childId);
        if (child) {
          prompt += `${i + 1}. ${child.title} (${child.stage})\n`;
        } else {
          prompt += `${i + 1}. ${childId}\n`;
        }
      });
    }
  }

  if (additionalPrompt) {
    prompt += `\n## 작업 지시\n${additionalPrompt}\n`;
  }

  prompt += `\n## 참고\n`;
  prompt += `- 작업 완료 후 todo.md의 해당 항목 마커를 업데이트해주세요.\n`;
  prompt += `- 모든 작업이 완료되면 마지막에 반드시 다음 최종 상태 보고를 출력하세요:\n`;
  prompt += `  ---\n`;
  prompt += `  [작업 완료] 티켓의 모든 작업이 완료되었습니다. CLI를 종료해도 좋습니다.\n`;
  prompt += `  ---\n`;

  // 원샷 모드: PM 컨펌 없이 즉시 이행하도록 지시
  if (mode === "one_shot") {
    prompt += `\n## 실행 모드: 원샷 (자동 승인)\n`;
    prompt += `- 이 작업은 PM이 칸반보드에서 직접 승인하여 실행한 작업입니다.\n`;
    prompt += `- 추가 컨펌/질문 없이 즉시 코드를 작성하고 완료하세요.\n`;
    prompt += `- Plan Mode 진입이나 PM 승인 대기 없이 바로 Act Mode로 이행하세요.\n`;
  }

  return prompt;
}
