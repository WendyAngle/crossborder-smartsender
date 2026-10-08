import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import {
  VAR_TYPE_LABEL,
  templatesUsingVar,
  useSmsStore,
  type TemplateVar,
  type VarType,
} from "@/lib/sms-store";

export const Route = createFileRoute("/template-variables")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "模板变量 · 短信营销管理系统" },
      { name: "description", content: "维护公司可复用的业务变量及默认值。" },
      { property: "og:title", content: "模板变量 · 短信营销管理系统" },
      { property: "og:description", content: "维护公司可复用的业务变量及默认值。" },
    ],
  }),
  component: TemplateVariablesPage,
});

function formatDateTime(value: string) {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 居中弹窗 */
function Modal({
  title,
  onClose,
  children,
  width = "w-[520px]",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className={`${width} max-w-full rounded-2xl border border-border bg-card p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <button
            aria-label="关闭"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-background"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 带黄色感叹号的确认弹窗 */
function ConfirmModal({
  title,
  lines,
  confirmLabel,
  danger,
  confirmDisabled,
  onCancel,
  onConfirm,
}: {
  title: string;
  lines: { text: string; tone?: "muted" | "warn" }[];
  confirmLabel: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onCancel}>
      <div
        className="w-[440px] max-w-full rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-bold text-white">
            !
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            <div className="mt-2 space-y-1.5 text-sm">
              {lines.map((l, i) => (
                <p
                  key={i}
                  className={
                    l.tone === "warn"
                      ? "font-medium text-amber-500"
                      : "text-muted-foreground"
                  }
                >
                  {l.text}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onCancel}>
            取消
          </button>
          <button
            className={`px-4 py-2 text-sm ${danger ? "btn-danger" : "btn-primary"} disabled:opacity-40`}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type Confirm =
  | { kind: "toggle"; v: TemplateVar }
  | { kind: "delete"; v: TemplateVar };

function TemplateVariablesPage() {
  const {
    templateVars,
    templates,
    addTemplateVar,
    updateTemplateVar,
    removeTemplateVar,
    setTemplateVarEnabled,
  } = useSmsStore();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [editing, setEditing] = useState<TemplateVar | null | undefined>(undefined);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  // 表单字段
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<VarType>("text");
  const [defaultValue, setDefaultValue] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templateVars.filter((v) => {
      if (status === "enabled" && !v.enabled) return false;
      if (status === "disabled" && v.enabled) return false;
      if (!q) return true;
      return v.code.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
    });
  }, [templateVars, query, status]);

  const { pageItems, props: pageProps } = usePagination(filtered, 20);

  function openForm(v: TemplateVar | null) {
    setCode(v?.code ?? "");
    setName(v?.name ?? "");
    setType(v?.type ?? "text");
    setDefaultValue(v?.defaultValue ?? "");
    setNote(v?.note ?? "");
    setFormError("");
    setEditing(v);
  }

  function save() {
    const payload = { code, name, type, defaultValue, note };
    const err = editing ? updateTemplateVar(editing.id, payload) : addTemplateVar(payload);
    if (err) {
      setFormError(err);
      return;
    }
    setEditing(undefined);
  }

  const deleteRefs = confirm?.kind === "delete" ? templatesUsingVar(confirm.v.code, templates) : [];

  return (
    <AppShell title="模板变量" subtitle="维护公司可复用的业务变量及默认值。">
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <input
            className="field w-56 py-1.5 text-xs"
            placeholder="搜索编码或名称"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pageProps.onPage(1);
            }}
          />
          <select
            className="field w-28 py-1.5 text-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | "enabled" | "disabled");
              pageProps.onPage(1);
            }}
          >
            <option value="all">全部状态</option>
            <option value="enabled">启用</option>
            <option value="disabled">禁用</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 个变量</span>
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => openForm(null)}>
            <span className="-ml-0.5 text-base leading-none">+</span> 新增变量
          </button>
        </div>

        <div className="px-5 pt-4">
          <h2 className="font-display text-[15px] font-semibold">用户变量</h2>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-y border-border bg-background/60 text-xs text-muted-foreground">
              <tr>
                {["变量编码", "显示名称", "类型", "默认值", "状态", "更新时间", "操作"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageItems.map((v) => (
                <tr key={v.id} className="hover:bg-background/70">
                  <td className="px-5 py-3.5 font-mono text-[13px]">{v.code}</td>
                  <td className="px-5 py-3.5">{v.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{VAR_TYPE_LABEL[v.type]}</td>
                  <td className="max-w-56 truncate px-5 py-3.5 text-muted-foreground" title={v.defaultValue}>
                    {v.defaultValue || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {v.enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        禁用
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted-foreground">
                    {formatDateTime(v.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <div className="flex gap-1">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openForm(v)}>
                        编辑
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => setConfirm({ kind: "toggle", v })}
                      >
                        {v.enabled ? "禁用" : "启用"}
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => setConfirm({ kind: "delete", v })}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    暂无匹配的变量，可调整筛选或点击「新增变量」创建
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...pageProps} unit="个" />
      </section>

      {editing !== undefined && (
        <Modal title={editing ? "编辑变量" : "新增变量"} onClose={() => setEditing(undefined)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">
                <span className="mr-1 text-destructive">*</span>变量编码
              </label>
              <input
                className="field mt-1.5 disabled:opacity-60"
                value={code}
                disabled={!!editing}
                onChange={(e) => setCode(e.target.value)}
                placeholder="例如 product_name"
              />
            </div>
            <div>
              <label className="text-xs font-medium">
                <span className="mr-1 text-destructive">*</span>显示名称
              </label>
              <input
                className="field mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">
                <span className="mr-1 text-destructive">*</span>数据类型
              </label>
              <select
                className="field mt-1.5"
                value={type}
                onChange={(e) => setType(e.target.value as VarType)}
              >
                {(Object.keys(VAR_TYPE_LABEL) as VarType[]).map((t) => (
                  <option key={t} value={t}>
                    {VAR_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">默认值</label>
              <textarea
                className="field mt-1.5 min-h-20 resize-y"
                value={defaultValue}
                maxLength={1000}
                onChange={(e) => setDefaultValue(e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">
                {defaultValue.length} / 1000
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">使用说明</label>
              <textarea
                className="field mt-1.5 min-h-20 resize-y"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-muted-foreground">
                {note.length} / 500
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setEditing(undefined)}>
                取消
              </button>
              <button className="btn-primary px-4 py-2 text-sm" onClick={save}>
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirm?.kind === "toggle" && (
        <ConfirmModal
          title={`${confirm.v.enabled ? "禁用" : "启用"}变量“${confirm.v.name}”`}
          lines={[
            confirm.v.enabled
              ? templatesUsingVar(confirm.v.code, templates).length > 0
                ? {
                    text: `当前有 ${templatesUsingVar(confirm.v.code, templates).length} 个模板引用该变量，禁用后新建任务不可再使用。`,
                  }
                : { text: "当前没有模板引用该变量。" }
              : { text: "启用后可在模板中引用该变量。" },
          ]}
          confirmLabel={confirm.v.enabled ? "禁用" : "启用"}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setTemplateVarEnabled(confirm.v.id, !confirm.v.enabled);
            setConfirm(null);
          }}
        />
      )}

      {confirm?.kind === "delete" && (
        <ConfirmModal
          title={`删除变量“${confirm.v.name}”`}
          danger
          confirmLabel="删除"
          confirmDisabled={deleteRefs.length > 0}
          lines={
            deleteRefs.length > 0
              ? [
                  { text: `已被 ${deleteRefs.length} 个模板引用：${deleteRefs.map((t) => t.name).join("、")}` },
                  { text: "被模板引用的变量删除会被拒绝，可改为禁用。", tone: "warn" },
                ]
              : [{ text: "当前没有模板引用该变量。" }]
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeTemplateVar(confirm.v.id);
            setConfirm(null);
          }}
        />
      )}
    </AppShell>
  );
}
