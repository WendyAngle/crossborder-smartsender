import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { regionLanguage } from "@/components/reply-drawer";
import { SmsPoster } from "@/components/sms-image";
import { formatTime, useSmsStore, type SmsRecord } from "@/lib/sms-store";
import { translateForRegion } from "@/lib/translate.functions";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "会话跟进 · 短信营销管理系统" },
      {
        name: "description",
        content: "以会话列表方式集中跟进有回复的目标商机：未读提醒、聊天式上下文与一键翻译回复。",
      },
      { property: "og:title", content: "会话跟进 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "以会话列表方式集中跟进有回复的目标商机：未读提醒、聊天式上下文与一键翻译回复。",
      },
    ],
  }),
  component: LeadsPage,
});

type LeadStatus = "unread" | "read";

const STATUS_LABEL: Record<LeadStatus, string> = {
  unread: "未读",
  read: "已读",
};

const STATUS_CLASS: Record<LeadStatus, string> = {
  unread: "bg-destructive/10 text-destructive",
  read: "bg-muted text-muted-foreground",
};

type Lead = {
  threadId: string;
  targetId: string;
  records: SmsRecord[];
  unread: number;
  lastReply: SmsRecord;
  lastAt: string;
  status: LeadStatus;
};

const timeOf = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return (formatTime(iso) ?? "").slice(0, 10);
}

function LeadsPage() {
  const { records, tasks, targetById, markReplyRead, sendReply } = useSmsStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const leads = useMemo<Lead[]>(() => {
    const byThread = new Map<string, SmsRecord[]>();
    for (const r of records) {
      const list = byThread.get(r.threadId) ?? [];
      list.push(r);
      byThread.set(r.threadId, list);
    }
    const out: Lead[] = [];
    for (const [threadId, list] of byThread) {
      const sorted = [...list].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
      const replies = sorted.filter((r) => r.reply);
      const lastReply = replies[replies.length - 1];
      if (!lastReply) continue;
      const unread = replies.filter((r) => !r.replyRead).length;
      const last = sorted[sorted.length - 1]!;
      const lastAt = Math.max(timeOf(lastReply.replyAt), timeOf(last.createdAt));
      const statusOf: LeadStatus = unread > 0 ? "unread" : "read";
      out.push({
        threadId,
        targetId: sorted[0]!.targetId,
        records: sorted,
        unread,
        lastReply,
        lastAt: new Date(lastAt).toISOString(),
        status: statusOf,
      });
    }
    return out.sort(
      (a, b) => Number(b.unread > 0) - Number(a.unread > 0) || timeOf(b.lastAt) - timeOf(a.lastAt),
    );
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      const t = targetById(l.targetId);
      return (
        (t?.name ?? "").toLowerCase().includes(q) ||
        (t?.phone ?? "").toLowerCase().includes(q) ||
        (t?.region ?? "").toLowerCase().includes(q) ||
        (l.lastReply.reply ?? "").toLowerCase().includes(q) ||
        (l.lastReply.replyZh ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, status, targetById]);

  const active = filtered.find((l) => l.threadId === activeId) ?? filtered[0] ?? null;

  function openLead(lead: Lead) {
    setActiveId(lead.threadId);
    for (const r of lead.records) {
      if (r.reply && !r.replyRead) markReplyRead(r.id);
    }
  }

  const totalUnread = leads.reduce((s, l) => s + l.unread, 0);
  const pendingCount = leads.filter((l) => l.stage === "pending").length;

  return (
    <AppShell
      title="会话跟进"
      subtitle={`${leads.length} 个有回复的会话 · ${pendingCount} 个待跟进 · ${totalUnread} 条未读`}
    >
      <div className="flex h-[calc(100vh-8.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-border bg-card">
        {/* 会话列表 */}
        <div className="flex w-[320px] shrink-0 flex-col border-r border-border">
          <div className="space-y-2.5 border-b border-border p-3.5">
            <input
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索目标 / 手机号 / 地区 / 回复内容"
            />
            <div className="flex gap-1.5">
              {(["all", "pending", "following", "watching"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                    stage === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "all" ? "全部" : STAGE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">暂无符合条件的商机会话</p>
            )}
            {filtered.map((l) => {
              const t = targetById(l.targetId);
              const isActive = active?.threadId === l.threadId;
              return (
                <button
                  key={l.threadId}
                  onClick={() => openLead(l)}
                  className={`flex w-full gap-3 border-b border-border/60 px-3.5 py-3 text-left transition ${
                    isActive ? "bg-accent/60" : "hover:bg-background"
                  }`}
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-display text-sm font-semibold text-accent-foreground">
                    {(t?.name ?? "?").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{t?.name ?? "未知目标"}</span>
                      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {relativeTime(l.lastAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate text-[11px] text-muted-foreground">
                        {t?.region ?? "—"} · {t?.phone ?? "—"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-start gap-2">
                      <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                        {l.lastReply.replyZh ?? l.lastReply.reply}
                      </p>
                      {l.unread > 0 && (
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground tabular-nums">
                          {l.unread}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] ${STAGE_CLASS[l.stage]}`}
                    >
                      {STAGE_LABEL[l.stage]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 会话详情 */}
        {active ? (
          <LeadChat
            key={active.threadId}
            lead={active}
            onSend={(text) => sendReply(active.records[active.records.length - 1]!.id, text)}
            taskName={tasks.find((t) => t.id === active.records[0]!.taskId)?.name ?? null}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
            左侧选择一个会话开始跟进
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LeadChat({
  lead,
  onSend,
  taskName,
}: {
  lead: Lead;
  onSend: (text: string) => void;
  taskName: string | null;
}) {
  const { targetById } = useSmsStore();
  const target = targetById(lead.targetId);
  const [text, setText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState("");
  const translate = useServerFn(translateForRegion);

  async function doTranslate() {
    if (!text.trim()) return;
    setTranslating(true);
    setError("");
    try {
      const res = await translate({ data: { text: text.trim(), region: target?.region ?? "" } });
      setOriginal(text.trim());
      setText(res.translated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "翻译失败，请稍后重试");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="grid size-8 place-items-center rounded-full bg-accent font-display text-xs font-semibold text-accent-foreground">
          {(target?.name ?? "?").slice(0, 1)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-medium">{target?.name ?? "未知目标"}</div>
          <div className="text-[11px] text-muted-foreground">
            {target?.region ?? "—"} · {target?.phone ?? "—"}
            {taskName ? ` · 来源任务：${taskName}` : ""}
          </div>
        </div>
        <span
          className={`ml-auto rounded-md px-2 py-1 text-[11px] ${STAGE_CLASS[lead.stage]}`}
        >
          {STAGE_LABEL[lead.stage]}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background/60 p-5">
        {lead.records.map((r) => (
          <div key={r.id} className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[76%]">
                <div className="mb-1 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                  <span>我方 · {r.kind === "campaign" ? "任务群发" : "人工跟进"}</span>
                  <span className="tabular-nums">{formatTime(r.createdAt)}</span>
                </div>
                <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground">
                  {(r.msgType ?? "text") === "image" ? (
                    <SmsPoster content={r.content} size="sm" />
                  ) : (
                    <p className="text-[13px] leading-relaxed">{r.content}</p>
                  )}
                  {r.contentZh && (
                    <p className="mt-1.5 border-t border-primary-foreground/25 pt-1.5 text-[11px] text-primary-foreground/80">
                      译文：{r.contentZh}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {r.reply && (
              <div className="flex justify-start">
                <div className="max-w-[76%]">
                  <div className="mb-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{target?.name ?? "对方"} 回复</span>
                    <span className="tabular-nums">{formatTime(r.replyAt)}</span>
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5">
                    <p className="text-[13px] leading-relaxed">{r.reply}</p>
                    {r.replyZh && (
                      <p className="mt-1.5 border-t border-border pt-1.5 text-[11px] text-muted-foreground">
                        译文：{r.replyZh}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border p-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">跟进回复</span>
          <button
            className="btn-ghost ml-auto px-3 py-1.5 text-xs"
            disabled={translating || !text.trim()}
            onClick={() => void doTranslate()}
          >
            {translating ? "翻译中…" : `翻译为${regionLanguage(target?.region ?? "")}`}
          </button>
        </div>
        <textarea
          className="field mt-1.5 min-h-20 resize-y"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`回复 ${target?.name ?? ""}…`}
        />
        {error && (
          <p className="mt-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {original && (
          <div className="mt-1.5 rounded-lg border border-border bg-background/60 p-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>翻译前内容</span>
              <button
                className="ml-auto underline hover:text-foreground"
                onClick={() => {
                  setText(original);
                  setOriginal("");
                }}
              >
                撤销翻译
              </button>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{original}</div>
          </div>
        )}
        <div className="mt-2 flex items-center gap-3">
          <p className="text-[11px] text-muted-foreground">
            回复将作为同一会话的第 {lead.records.length + 1} 条短信独立计费。
          </p>
          <button
            className="btn-primary ml-auto px-4 py-2 text-sm"
            disabled={!text.trim()}
            onClick={() => {
              if (!text.trim()) return;
              onSend(text.trim());
              setText("");
              setOriginal("");
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
