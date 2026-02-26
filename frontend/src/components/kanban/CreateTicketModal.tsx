"use client";

// ============================================================
// 티켓 생성 모달
// Plan 칼럼 "+" 버튼 → 제목 입력 + 섹션 선택 → 생성
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus } from "lucide-react";
import type { Section } from "@/src/types";
import { getSectionCategory } from "@/src/constants/kanban";
import Badge from "@/src/components/common/Badge";
import { cn } from "@/src/lib/utils";

interface CreateTicketModalProps {
  /** 현재 프로젝트의 섹션 목록 */
  sections: Section[];
  /** 모달 닫기 */
  onClose: () => void;
  /** 생성 제출 (섹션명, 제목) */
  onSubmit: (sectionName: string, title: string) => void;
}

export default function CreateTicketModal({
  sections,
  onClose,
  onSubmit,
}: CreateTicketModalProps) {
  const [title, setTitle] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>(
    sections[0]?.name ?? ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // 마운트 시 제목 입력에 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed || !selectedSection) return;
    onSubmit(selectedSection, trimmed);
  }, [title, selectedSection, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [handleSubmit, onClose]
  );

  const isValid = title.trim().length > 0 && selectedSection.length > 0;

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-gradient-line relative w-full max-w-md rounded-xl border border-white/[0.08] bg-slate-900/80 shadow-2xl backdrop-blur-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
          <h3 className="text-base font-semibold">새 티켓 추가</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="space-y-4 px-5 py-4">
          {/* 제목 입력 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              제목
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="티켓 제목을 입력하세요"
              maxLength={200}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-accent/40 focus:bg-white/[0.05]"
            />
          </div>

          {/* 섹션 선택 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              섹션
            </label>
            {sections.length === 0 ? (
              <p className="text-xs text-muted/60">
                프로젝트에 섹션이 없습니다
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => {
                  const cat = getSectionCategory(section.name);
                  const isSelected = selectedSection === section.name;
                  return (
                    <button
                      key={section.line_number}
                      onClick={() => setSelectedSection(section.name)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                        isSelected
                          ? "ring-1 ring-accent/50 scale-[1.02]"
                          : "opacity-50 hover:opacity-80"
                      )}
                      style={{
                        color: cat.color,
                        backgroundColor: isSelected
                          ? cat.bgColor
                          : `${cat.bgColor}`,
                      }}
                    >
                      <Badge
                        color={cat.color}
                        bgColor="transparent"
                        size="sm"
                        className="mr-1 px-1"
                      >
                        {cat.label}
                      </Badge>
                      {section.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end border-t border-white/[0.05] px-5 py-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isValid
                ? "bg-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:bg-accent-hover"
                : "cursor-not-allowed bg-white/[0.05] text-muted/40"
            )}
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
