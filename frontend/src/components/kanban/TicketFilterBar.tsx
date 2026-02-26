"use client";

// ============================================================
// 티켓 검색/필터 바
// 텍스트 검색 + 카테고리 배지 필터 + 타입 필터 + 초기화
// ============================================================

import { useRef, useCallback } from "react";
import { Search, X, Filter } from "lucide-react";
import { useKanbanStore } from "@/src/store/useKanbanStore";
import { FILTER_CATEGORIES } from "@/src/constants/kanban";
import Badge from "@/src/components/common/Badge";
import { cn } from "@/src/lib/utils";

const TICKET_TYPES = [
  { key: "standalone", label: "독립" },
  { key: "epic", label: "에픽" },
  { key: "child", label: "하위" },
] as const;

export default function TicketFilterBar() {
  const {
    searchQuery, filterCategories, filterTypes,
    setSearchQuery, toggleFilterCategory, toggleFilterType, clearFilters,
  } = useKanbanStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 200);
    },
    [setSearchQuery]
  );

  const handleClear = useCallback(() => {
    clearFilters();
    if (inputRef.current) inputRef.current.value = "";
  }, [clearFilters]);

  const hasFilter =
    searchQuery.length > 0 ||
    filterCategories.size > 0 ||
    filterTypes.size > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-2.5 border-b border-white/[0.05]">
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="text"
          placeholder="티켓 검색..."
          defaultValue={searchQuery}
          onChange={handleSearchChange}
          className="h-8 w-52 rounded-lg border border-white/[0.08] bg-white/[0.03]
                     pl-8 pr-3 text-sm text-foreground placeholder-muted
                     outline-none transition-colors focus:border-accent/40"
        />
      </div>

      {/* 구분선 */}
      <div className="h-5 w-px bg-white/[0.08]" />

      {/* 카테고리 필터 배지들 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted" />
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => toggleFilterCategory(cat.label)}
          >
            <Badge
              color={filterCategories.has(cat.label) ? cat.color : undefined}
              bgColor={filterCategories.has(cat.label) ? cat.bgColor : undefined}
              className={cn(
                "cursor-pointer border transition-all",
                filterCategories.has(cat.label)
                  ? "border-current/20 shadow-sm"
                  : "border-white/[0.05] text-muted opacity-50 hover:opacity-80"
              )}
            >
              {cat.label}
            </Badge>
          </button>
        ))}
      </div>

      {/* 구분선 */}
      <div className="h-5 w-px bg-white/[0.08]" />

      {/* 타입 필터 */}
      <div className="flex items-center gap-1.5">
        {TICKET_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleFilterType(key)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all",
              filterTypes.has(key)
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-white/[0.05] text-muted opacity-50 hover:opacity-80"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 필터 초기화 */}
      {hasFilter && (
        <button
          onClick={handleClear}
          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted
                     transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          초기화
        </button>
      )}
    </div>
  );
}
