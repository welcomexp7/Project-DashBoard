"use client";

// ============================================================
// 범용 뱃지 컴포넌트
// 섹션명, 프로젝트명, 스테이지 라벨 등에 사용
// ============================================================

import { cn } from "@/src/lib/utils";

interface BadgeProps {
  /** 뱃지 텍스트 */
  children: React.ReactNode;
  /** 뱃지 색상 (CSS color 값) */
  color?: string;
  /** 뱃지 배경색 (CSS color 값) */
  bgColor?: string;
  /** 추가 클래스 */
  className?: string;
  /** 크기 */
  size?: "sm" | "md";
}

export default function Badge({
  children,
  color,
  bgColor,
  className,
  size = "sm",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        !color && !bgColor && "bg-surface text-muted",
        className
      )}
      style={{
        ...(color ? { color } : {}),
        ...(bgColor ? { backgroundColor: bgColor } : {}),
      }}
    >
      {children}
    </span>
  );
}
