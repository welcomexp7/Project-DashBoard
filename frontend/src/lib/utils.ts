// ============================================================
// 유틸리티 함수
// ============================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 유틸리티 (clsx + tailwind-merge) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
