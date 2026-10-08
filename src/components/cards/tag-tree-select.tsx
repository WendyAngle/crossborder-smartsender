import { useState } from "react";
import { ChevronDown, ChevronRight, Search, X, Check } from "lucide-react";

type TagNode = { id: string; name: string; parentId: string | null };

/** 树形多选标签下拉：分组可折叠，支持搜索。 */
export function TagTreeSelect({ tags, value, onChange, placeholder }: { tags: TagNode[]; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const roots = tags.filter(t => !t.parentId);
  const kw = q.trim().toLowerCase();
  const hit = (t: TagNode) => !kw || t.name.toLowerCase().includes(kw);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  const name = (id: string) => tags.find(t => t.id === id)?.name ?? id;
  const item = (t: TagNode, child: boolean) => (
    <button type="button" key={t.id} onClick={() => toggle(t.id)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted ${child ? "pl-12" : "pl-8"} ${value.includes(t.id) ? "text-primary font-medium" : ""}`}>
      {t.name}{value.includes(t.id) && <Check className="size-4" />}
    </button>
  );
  return (
    <div className="relative">
      <div role="combobox" aria-expanded={open} aria-label={placeholder} onClick={() => setOpen(true)} className={`flex min-h-10 cursor-text flex-wrap items-center gap-1 rounded-md border bg-background px-3 py-1.5 ${open ? "border-primary ring-2 ring-primary/20" : "border-input"}`}>
        {value.map(id => <span key={id} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">{name(id)}<X className="size-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggle(id); }} /></span>)}
        <input className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={value.length ? "" : placeholder} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        {open ? <Search className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </div>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {roots.map(r => {
            const kids = tags.filter(t => t.parentId === r.id && (hit(t) || hit(r)));
            if (!hit(r) && !kids.length) return null;
            const isCol = collapsed.includes(r.id) && !kw;
            return <div key={r.id}>
              <div className="relative">
                {kids.length > 0 && <button type="button" aria-label="展开/收起" className="absolute left-2 top-2.5 text-muted-foreground" onClick={() => setCollapsed(c => c.includes(r.id) ? c.filter(x => x !== r.id) : [...c, r.id])}>{isCol ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}</button>}
                {item(r, false)}
              </div>
              {!isCol && kids.map(k => item(k, true))}
            </div>;
          })}
          {!tags.some(hit) && <p className="px-3 py-4 text-center text-sm text-muted-foreground">无匹配标签</p>}
        </div>
      </>}
    </div>
  );
}
