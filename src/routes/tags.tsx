import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { useSmsStore, type Tag } from "@/lib/sms-store";

export const Route = createFileRoute("/tags")({
  head: () => ({
    meta: [
      { title: "标签管理 · 短信营销管理系统" },
      {
        name: "description",
        content: "维护目标标签分组与子标签，支持新增、编辑、删除与新增子标签，用于名单精细分层。",
      },
      { property: "og:title", content: "标签管理 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "维护目标标签分组与子标签，支持新增、编辑、删除与新增子标签，用于名单精细分层。",
      },
    ],
  }),
  component: TagsPage,
});

type Mode =
  | { kind: "none" }
  | { kind: "create"; parent: Tag | null }
  | { kind: "edit"; tag: Tag };

function TagsPage() {
  const { tags, targets, addTag, updateTag, removeTag } = useSmsStore();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const groups = useMemo(() => tags.filter((t) => t.parentId === null), [tags]);
  const childrenOf = (id: string) => tags.filter((t) => t.parentId === id);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of targets) for (const id of t.tagIds ?? []) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [targets]);

  function openCreate(parent: Tag | null) {
    setName("");
    setFormError("");
    setMode({ kind: "create", parent });
  }

  function openEdit(tag: Tag) {
    setName(tag.name);
    setFormError("");
    setMode({ kind: "edit", tag });
  }

  function save() {
    const clean = name.trim();
    if (!clean) {
      setFormError("请填写标签名称");
      return;
    }
    const siblings =
      mode.kind === "create"
        ? tags.filter((t) => t.parentId === (mode.parent?.id ?? null))
        : tags.filter((t) => t.parentId === (mode.kind === "edit" ? mode.tag.parentId : null));
    const dup = siblings.some(
      (t) => t.name === clean && !(mode.kind === "edit" && t.id === mode.tag.id),
    );
    if (dup) {
      setFormError("同级已存在同名标签");
      return;
    }
    if (mode.kind === "create") addTag(clean, mode.parent?.id ?? null);
    else if (mode.kind === "edit") updateTag(mode.tag.id, clean);
    setMode({ kind: "none" });
  }

  function doRemove(tag: Tag) {
    const childCount = childrenOf(tag.id).length;
    const affected =
      (usage.get(tag.id) ?? 0) +
      childrenOf(tag.id).reduce((sum, c) => sum + (usage.get(c.id) ?? 0), 0);
    if (confirmId !== tag.id) {
      setConfirmId(tag.id);
      return;
    }
    void childCount;
    void affected;
    removeTag(tag.id);
    setConfirmId(null);
  }

  const childCount = tags.filter((t) => t.parentId !== null).length;
  const usedTargets = targets.filter((t) => (t.tagIds ?? []).length > 0).length;

  return (
    <AppShell
      title="标签管理"
      subtitle="目标标签分组与子标签维护"
      drawer={
        mode.kind !== "none" ? (
          <Drawer
            title={
              mode.kind === "edit"
                ? "编辑标签"
                : mode.parent
                  ? `在「${mode.parent.name}」下新增子标签`
                  : "新增分组标签"
            }
            onClose={() => setMode({ kind: "none" })}
            footer={
              <>
                <button
                  className="btn-ghost px-4 py-2.5 text-sm"
                  onClick={() => setMode({ kind: "none" })}
                >
                  取消
                </button>
                <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={save}>
                  保存
                </button>
              </>
            }
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">标签名称</label>
              <input
                className="field mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode.kind === "create" && !mode.parent ? "如：客户等级" : "如：高价值客户"}
              />
            </div>
            <p className="rounded-lg border border-border bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
              标签共两级：分组标签用于归类（如客户等级、行业），子标签才是名单上真正打的标记。分组标签也可直接打在目标上。
            </p>
            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="分组标签" value={String(groups.length)} />
        <StatCard label="子标签" value={String(childCount)} tone="primary" />
        <StatCard label="已打标目标" value={String(usedTargets)} />
        <StatCard label="未打标目标" value={String(targets.length - usedTargets)} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">标签体系</h2>
          <span className="text-xs text-muted-foreground">
            共 {groups.length} 个分组 · {childCount} 个子标签
          </span>
          <div className="ml-auto">
            <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => openCreate(null)}>
              <span className="-ml-0.5 text-base leading-none">+</span> 新增分组标签
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">标签名称</th>
              <th className="px-3 py-3 font-medium">层级</th>
              <th className="px-3 py-3 font-medium">关联目标数</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map((g) => {
              const kids = childrenOf(g.id);
              const groupTotal =
                (usage.get(g.id) ?? 0) + kids.reduce((s, c) => s + (usage.get(c.id) ?? 0), 0);
              return [
                <tr key={g.id} className="bg-background/40">
                  <td className="px-5 py-3 font-medium">{g.name}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                      分组标签
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{groupTotal}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        className="btn-ghost px-3 py-1.5 text-xs"
                        onClick={() => openCreate(g)}
                      >
                        新增子标签
                      </button>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => openEdit(g)}>
                        编辑
                      </button>
                      <button
                        className="btn-ghost px-3 py-1.5 text-xs hover:text-destructive"
                        onClick={() => doRemove(g)}
                      >
                        {confirmId === g.id ? "确认删除？" : "删除"}
                      </button>
                    </div>
                  </td>
                </tr>,
                ...kids.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-background/70">
                    <td className="px-5 py-3">
                      <span className="mr-2 text-muted-foreground/60">└</span>
                      {c.name}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        子标签
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {usage.get(c.id) ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => openEdit(c)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs hover:text-destructive"
                          onClick={() => doRemove(c)}
                        >
                          {confirmId === c.id ? "确认删除？" : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )),
              ];
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  还没有标签，先新增一个分组标签（如客户等级）再补充子标签
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
