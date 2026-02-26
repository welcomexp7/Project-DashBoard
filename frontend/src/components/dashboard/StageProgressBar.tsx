"use client";

// ============================================================
// 스테이지 진행률 누적 바
// Aceternity UI: 각 세그먼트에 미세 글로우 효과
// ============================================================

import { KANBAN_STAGES } from "@/src/constants/kanban";

interface StageProgressBarProps {
  ticketCountByStage: Record<string, number>;
  total: number;
}

export default function StageProgressBar({
  ticketCountByStage,
  total,
}: StageProgressBarProps) {
  if (total === 0) {
    return (
      <div className="h-2 w-full rounded-full bg-white/[0.05]">
        <div className="h-full w-0 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
      {KANBAN_STAGES.map(({ key, color }) => {
        const count = ticketCountByStage[key] ?? 0;
        const percentage = (count / total) * 100;
        if (percentage === 0) return null;
        return (
          <div
            key={key}
            className="h-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}40`,
            }}
            title={`${key}: ${count}건 (${Math.round(percentage)}%)`}
          />
        );
      })}
    </div>
  );
}
