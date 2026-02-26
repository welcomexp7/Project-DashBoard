"use client";

// ============================================================
// 프로젝트 요약 카드
// Aceternity UI: Spotlight + Moving Gradient Border
// ============================================================

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { ProjectResponse } from "@/src/types";
import { KANBAN_STAGES } from "@/src/constants/kanban";
import StageProgressBar from "./StageProgressBar";

interface ProjectSummaryCardProps {
  project: ProjectResponse;
}

export default function ProjectSummaryCard({
  project,
}: ProjectSummaryCardProps) {
  const router = useRouter();
  const totalTickets = Object.values(project.ticket_count_by_stage).reduce(
    (sum, count) => sum + count,
    0
  );
  const completedCount =
    (project.ticket_count_by_stage["완료"] ?? 0) +
    (project.ticket_count_by_stage["QA Done"] ?? 0) +
    (project.ticket_count_by_stage["배포"] ?? 0);
  const progressPercent =
    totalTickets > 0 ? Math.round((completedCount / totalTickets) * 100) : 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--spotlight-x",
      `${e.clientX - rect.left}px`
    );
    e.currentTarget.style.setProperty(
      "--spotlight-y",
      `${e.clientY - rect.top}px`
    );
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ transformPerspective: 1000 }}
      onClick={() => router.push(`/board/${project.project_id}`)}
      onMouseMove={handleMouseMove}
      className="moving-border card-spotlight group relative cursor-pointer overflow-visible rounded-xl border border-white/[0.05] bg-white/[0.03] backdrop-blur-md transition-colors"
    >
      {/* 왼쪽 프로젝트 컬러 바 */}
      <div
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
        style={{ backgroundColor: project.color }}
      />

      <div className="p-5 pl-6">
        {/* 프로젝트명 + 진행률 */}
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-accent">
            {project.name}
          </h3>
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-sm font-bold text-transparent">
            {progressPercent}%
          </span>
        </div>

        {/* 진행률 바 */}
        <div className="relative z-10 mb-4">
          <StageProgressBar
            ticketCountByStage={project.ticket_count_by_stage}
            total={totalTickets}
          />
        </div>

        {/* 스테이지별 티켓 수 */}
        <div className="relative z-10 flex flex-wrap gap-2">
          {KANBAN_STAGES.map(({ key, label, color, bgColor }) => {
            const count = project.ticket_count_by_stage[key] ?? 0;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: bgColor, color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
                <span className="ml-0.5 font-bold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* 총 티켓 수 */}
        <div className="relative z-10 mt-3 text-xs text-muted">
          총 {totalTickets}개 티켓
        </div>
      </div>
    </motion.div>
  );
}
