import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Tag } from "lucide-react";

export type TagNode = { id: string; name: string; parentId: string | null };

/** 层级标签筛选下拉：父级标签可展开、可选择（选父级即含其子标签）。 */
export function TagFilterSelect({
  tags,
  value,
  onChange,
  ariaLabel = "电话卡标签",
}: {
  tags: TagNode[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const groups = tags.filter((t) => !t.parentId);
  const childrenOf = (id: string) => tags.filter((t) => t.parentId === id);
  const label =
    value === "all" ? "全部标签" : (tags.find((t) => t.id === value)?.name ?? "全部标签");

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const row = (t: TagNode, depth: number) => {
    const kids = childrenOf(t.id);
    const isOpen = expanded.includes(t.id);
    return (
      <div key={t.id}>
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
            value === t.id ? "bg-accent font-medium" : ""
          }`}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
        >
          {kids.length ? (
            <button
              type="button"
              aria-label={`${isOpen ? "收起" : "展开"} ${t.name}`}
              className="grid size-5 place-items-center text-muted-foreground"
              onClick={() =>
                setExpanded((s) => (isOpen ? s.filter((x) => x !== t.id) : [...s, t.id]))
              }
            >
              {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="size-5" />
          )}
          <button type="button" className="flex-1 text-left" onClick={() => pick(t.id)}>
            {t.name}
            {kids.length > 0 && <span className="ml-1 text-xs text-muted-foreground">（含子标签）</span>}
          </button>
        </div>
        {isOpen && kids.map((c) => row(c, depth + 1))}
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="field flex max-w-44 items-center gap-2"
      >
        <Tag className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-xl">
          <button
            type="button"
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${
              value === "all" ? "bg-accent font-medium" : ""
            }`}
            onClick={() => pick("all")}
          >
            全部标签
          </button>
          {groups.map((g) => row(g, 0))}
          {!groups.length && (
            <p className="px-2 py-3 text-xs text-muted-foreground">暂无标签</p>
          )}
        </div>
      )}
    </div>
  );
}
