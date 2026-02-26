"use client";

// ============================================================
// 대시보드 그리드
// 프로젝트 카드들을 반응형 그리드로 배치
// Framer Motion stagger 애니메이션 적용
// ============================================================

import { motion } from "framer-motion";
import type { ProjectResponse } from "@/src/types";
import ProjectSummaryCard from "./ProjectSummaryCard";

interface DashboardGridProps {
  projects: ProjectResponse[];
}

/** stagger 애니메이션 컨테이너 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/** 개별 카드 애니메이션 */
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function DashboardGrid({ projects }: DashboardGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-4 opacity-30"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm">등록된 프로젝트가 없습니다</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map((project) => (
        <motion.div key={project.project_id} variants={itemVariants}>
          <ProjectSummaryCard project={project} />
        </motion.div>
      ))}
    </motion.div>
  );
}
