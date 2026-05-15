"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

type PaginationItem = number | "ellipsis";

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [];

  items.push(1);

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        aria-label="Página anterior"
        className="h-7 w-7 rounded-lg border border-border text-secondary-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-30 transition-colors flex items-center justify-center"
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-1">
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="h-7 min-w-7 px-2 rounded-lg border border-transparent text-foreground/80 text-xs font-semibold flex items-center justify-center"
              >
                ...
              </span>
            );
          }

          const isActive = item === currentPage;

          return (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              disabled={loading}
              aria-current={isActive ? "page" : undefined}
              className={[
                "h-7 min-w-7 px-2 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-center",
                isActive
                  ? "bg-primary text-white border-primary"
                  : "border-border text-foreground hover:bg-background",
              ].join(" ")}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        aria-label="Próxima página"
        className="h-7 w-7 rounded-lg border border-border text-secondary-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-30 transition-colors flex items-center justify-center"
      >
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
