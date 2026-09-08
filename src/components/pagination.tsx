import { useEffect, useMemo, useState } from "react";

const SIZES = [10, 20, 50];

export function usePagination<T>(items: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const current = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((current - 1) * size, current * size),
    [items, current, size],
  );

  return {
    pageItems,
    props: {
      page: current,
      pageCount,
      total,
      size,
      onPage: setPage,
      onSize: (n: number) => {
        setSize(n);
        setPage(1);
      },
    },
  };
}

export function Pagination({
  page,
  pageCount,
  total,
  size,
  onPage,
  onSize,
  unit = "条",
}: {
  page: number;
  pageCount: number;
  total: number;
  size: number;
  onPage: (n: number) => void;
  onSize: (n: number) => void;
  unit?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
      <span className="tabular-nums">
        第 {from}–{to} {unit} / 共 {total} {unit}
      </span>
      <label className="flex items-center gap-1.5">
        每页
        <select
          className="field w-16 py-1 text-xs"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
        >
          {SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="ml-auto flex items-center gap-1">
        <button
          className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          上一页
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1.5">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-background hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
