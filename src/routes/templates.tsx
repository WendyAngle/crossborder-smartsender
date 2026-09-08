import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import {
  VARIABLES,
  countCredits,
  renderTemplate,
  useSmsStore,
  type Template,
} from "@/lib/sms-store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "短信模板 · 短信营销管理系统" },
      {
        name: "description",
        content: "创建、编辑与删除短信模板，支持联系人、我方产品、官网链接等参数变量。",
      },
      { property: "og:title", content: "短信模板 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "创建、编辑与删除短信模板，支持联系人、我方产品、官网链接等参数变量。",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, removeTemplate } = useSmsStore();
  const [editing, setEditing] = useState<Template | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const open = editing !== undefined;
  const { pageItems, props: pageProps } = usePagination(templates);

  function openDrawer(tpl: Template | null) {
    setName(tpl?.name ?? "");
    setContent(tpl?.content ?? "");
    setEditing(tpl);
  }

  function insertVariable(token: string) {
    const el = areaRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  function save() {
    if (!name.trim() || !content.trim()) return;
    const payload = { name: name.trim(), content: content.trim() };
    if (editing) updateTemplate(editing.id, payload);
    else addTemplate(payload);
    setEditing(undefined);
  }

  return (
    <AppShell
      title="短信模板"
      subtitle="模板内容与参数变量"
      drawer={
        open ? (
          <Drawer
            title={editing ? "编辑模板" : "新建模板"}
            onClose={() => setEditing(undefined)}
            footer={
              <>
                <button
                  className="btn-ghost px-4 py-2.5 text-sm"
                  onClick={() => setEditing(undefined)}
                >
                  取消
                </button>
                <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={save}>
                  保存模板
                </button>
              </>
            }
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">模板名称</label>
              <input
                className="field mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="新客首单立减"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">模板内容</label>
              <textarea
                ref={areaRef}
                className="field mt-1.5 min-h-36 resize-y leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="【信汇】{联系人}，{我方产品} 限时开启，点击 {官网链接} 抢购 →"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    onClick={() => insertVariable(v.token)}
                    className="rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground"
                  >
                    {v.token}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                点击变量插入到光标处，发送时自动替换为目标信息。
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">内容预览</label>
              <div className="mt-1.5 rounded-xl bg-background p-3">
                <div className="mb-2 text-[10px] text-muted-foreground">信汇 · 预览机</div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/80 shadow-[0_0_0_1px_color-mix(in_oklab,black_5%,transparent)]">
                  {content ? renderTemplate(content) : "输入内容后即可预览"}
                </div>
                <div className="mt-2 text-right text-[10px] text-muted-foreground">
                  单条约 {content ? countCredits(content) : 0} 积分
                </div>
              </div>
            </div>
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="模板总数" value={String(templates.length)} />
        <StatCard label="可用变量" value={String(VARIABLES.length)} tone="primary" />
        <StatCard
          label="平均积分"
          value={
            templates.length
              ? String(
                  Math.round(
                    templates.reduce((s, t) => s + countCredits(t.content), 0) / templates.length,
                  ),
                )
              : "0"
          }
        />
        <StatCard label="含变量模板" value={String(templates.filter((t) => t.content.includes("{")).length)} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">模板库</h2>
          <span className="text-xs text-muted-foreground">共 {templates.length} 个</span>
          <div className="ml-auto">
            <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => openDrawer(null)}>
              <span className="-ml-0.5 text-base leading-none">+</span> 新建模板
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start gap-4 px-5 py-4 hover:bg-background/70">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t.name}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.content}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VARIABLES.filter((v) => t.content.includes(v.token)).map((v) => (
                    <span
                      key={v.token}
                      className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground"
                    >
                      {v.token}
                    </span>
                  ))}
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    约 {countCredits(t.content)} 积分
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => openDrawer(t)}>
                  编辑
                </button>
                <button
                  className="btn-ghost px-3 py-1.5 text-xs hover:text-destructive"
                  onClick={() => removeTemplate(t.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              暂无模板，点击「新建模板」创建
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
