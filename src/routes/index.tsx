import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { MsgTypePill, SmsPoster } from "@/components/sms-image";
import {
  formatTime,
  useSmsStore,
  type MsgType,
  type SmsRecord,
  type SmsStatus,
} from "@/lib/sms-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "短信明细 · 短信营销管理系统" },
      {
        name: "description",
        content: "查看跨境短信发送明细：状态、积分消耗、成功时间、失败原因与客户回复。",
      },
      { property: "og:title", content: "短信明细 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "查看跨境短信发送明细：状态、积分消耗、成功时间、失败原因与客户回复。",
      },
    ],
  }),
  component: DetailsPage,
});

const STATUS_LABEL: Record<SmsStatus, string> = {
  sending: "发送中",
  sent: "已发送",
  delivered: "已送达",
  failed: "失败",
};

function StatusPill({ status }: { status: SmsStatus }) {
  const cls =
    status === "delivered"
      ? "bg-accent text-accent-foreground"
      : status === "sent"
        ? "bg-muted text-foreground"
        : status === "sending"
          ? "bg-warning-soft text-warning-foreground"
          : "bg-destructive-soft text-destructive";
  const dot =
    status === "delivered"
      ? "bg-primary"
      : status === "sent"
        ? "bg-foreground/40"
        : status === "sending"
          ? "bg-warning"
          : "bg-destructive";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** 悬浮气泡：展示实际发送/回复原文 + 中文译文 */
function HoverBubble({
  label,
  original,
  translated,
  poster = false,
  children,
}: {
  label: string;
  original: string;
  translated: string | null;
  /** 图片短信：气泡内展示生成图 */
  poster?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex cursor-default items-center gap-1">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-xl bg-ink p-3 text-left text-[11px] leading-snug text-ink-foreground/90 shadow-lg group-hover:block">
        <span className="block text-[10px] uppercase tracking-wide text-ink-foreground/40">
          {label}
        </span>
        {poster ? (
          <span className="mt-1.5 block">
            <SmsPoster content={original} size="sm" />
          </span>
        ) : (
          <span className="mt-1 block whitespace-pre-wrap">{original}</span>
        )}
        {translated && (
          <>
            <span className="mt-2 block border-t border-ink-foreground/15 pt-2 text-[10px] uppercase tracking-wide text-ink-foreground/40">
              中文译文
            </span>
            <span className="mt-1 block whitespace-pre-wrap">{translated}</span>
          </>
        )}
      </span>
    </span>
  );
}

function DetailsPage() {
  const { records, targetById, sendReply, threadRecords } = useSmsStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SmsStatus>("all");
  const [replyFilter, setReplyFilter] = useState<"all" | "yes" | "no">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | MsgType>("all");
  const [replyTo, setReplyTo] = useState<SmsRecord | null>(null);
  const [replyText, setReplyText] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && (r.msgType ?? "text") !== typeFilter) return false;
      if (replyFilter === "yes" && !r.reply) return false;
      if (replyFilter === "no" && r.reply) return false;
      if (!q) return true;
      const t = targetById(r.targetId);
      return (
        (t?.name ?? "").toLowerCase().includes(q) ||
        (t?.phone ?? "").toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.contentZh ?? "").toLowerCase().includes(q)
      );
    });
    // 同一会话的记录聚在一起：会话按最新时间倒序，会话内按序号正序
    const latest = new Map<string, number>();
    for (const r of list) {
      const t = new Date(r.createdAt).getTime();
      latest.set(r.threadId, Math.max(latest.get(r.threadId) ?? 0, t));
    }
    return [...list].sort(
      (a, b) =>
        (latest.get(b.threadId) ?? 0) - (latest.get(a.threadId) ?? 0) ||
        a.threadId.localeCompare(b.threadId) ||
        a.seq - b.seq,
    );
  }, [records, query, statusFilter, replyFilter, typeFilter, targetById]);

  const { pageItems, props: pageProps } = usePagination(filtered);

  const delivered = records.filter((r) => r.status === "delivered").length;
  const replies = records.filter((r) => r.reply).length;
  const credits = records.reduce((s, r) => s + (r.status === "failed" ? 0 : r.credits), 0);

  const thread = replyTo ? threadRecords(replyTo.threadId) : [];

  return (
    <AppShell
      title="短信明细"
      subtitle="跨境营销发送记录"
      drawer={
        replyTo ? (
          <Drawer
            title="会话与回复"
            hint={`${targetById(replyTo.targetId)?.name ?? ""} · ${targetById(replyTo.targetId)?.region ?? ""}`}
            width="w-[560px]"
            onClose={() => setReplyTo(null)}
            footer={
              <>
                <button className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setReplyTo(null)}>
                  取消
                </button>
                <button
                  className="btn-primary flex-1 px-4 py-2.5 text-sm"
                  onClick={() => {
                    if (!replyText.trim()) return;
                    sendReply(replyTo.id, replyText.trim());
                    setReplyText("");
                    setReplyTo(null);
                  }}
                >
                  发送回复（新增一条短信）
                </button>
              </>
            }
          >
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                会话记录 · 共 {thread.length} 条外发
              </div>
              <div className="mt-2 space-y-2.5">
                {thread.map((r) => (
                  <div key={r.id} className="space-y-2.5">
                    <div className="rounded-xl bg-background p-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        我方 · 第 {r.seq} 条 · {r.kind === "campaign" ? "任务群发" : "人工回复"} ·{" "}
                        {(r.msgType ?? "text") === "image" ? "图片" : "文本"}
                        <span className="ml-auto tabular-nums">{formatTime(r.createdAt)}</span>
                      </div>
                      {(r.msgType ?? "text") === "image" ? (
                        <div className="mt-1.5 max-w-[80%]">
                          <SmsPoster content={r.content} size="sm" />
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[13px] leading-relaxed">{r.content}</div>
                      )}
                      {r.contentZh && (
                        <div className="mt-1.5 border-t border-border pt-1.5 text-xs text-muted-foreground">
                          译文：{r.contentZh}
                        </div>
                      )}
                    </div>
                    {r.reply && (
                      <div className="ml-6 rounded-xl bg-accent p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-accent-foreground/70">
                          对方回复
                          <span className="ml-auto tabular-nums">{formatTime(r.replyAt)}</span>
                        </div>
                        <div className="mt-1.5 text-[13px] leading-relaxed text-accent-foreground">
                          {r.reply}
                        </div>
                        {r.replyZh && (
                          <div className="mt-1.5 border-t border-accent-foreground/15 pt-1.5 text-xs text-accent-foreground/70">
                            译文：{r.replyZh}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">回复内容</label>
                <button
                  className="btn-ghost ml-auto px-3 py-1.5 text-xs"
                  disabled={translating || !replyText.trim()}
                  onClick={() => {
                    const region = targetById(replyTo.targetId)?.region ?? "";
                    void doTranslate(replyText, region);
                  }}
                >
                  {translating ? "翻译中…" : `翻译为${targetById(replyTo.targetId)?.region ?? ""}语言`}
                </button>
              </div>
              <textarea
                className="field mt-1.5 min-h-28 resize-y"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="输入回复内容…"
              />
              {translateError && (
                <p className="mt-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {translateError}
                </p>
              )}
              {originalText && (
                <div className="mt-1.5 rounded-lg border border-border bg-background/60 p-2.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>翻译前内容</span>
                    <button
                      className="ml-auto underline hover:text-foreground"
                      onClick={() => {
                        setReplyText(originalText);
                        setOriginalText("");
                      }}
                    >
                      撤销翻译
                    </button>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{originalText}</div>
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                回复将作为同一会话的第 {thread.length + 1} 条短信独立记账，原记录保持不变。
              </p>
            </div>
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="今日发送" value={records.length.toLocaleString()} />
        <StatCard
          label="送达率"
          value={records.length ? `${((delivered / records.length) * 100).toFixed(1)}%` : "—"}
          tone="primary"
        />
        <StatCard label="待回复" value={String(replies)} />
        <StatCard label="消耗积分" value={credits.toLocaleString()} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">发送记录</h2>
          <span className="text-xs text-muted-foreground">共 {filtered.length} 条</span>
          <div className="ml-auto flex items-center gap-2">
            <input
              className="field w-56 py-1.5 text-xs"
              placeholder="搜索目标 / 手机号 / 内容"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="field w-28 py-1.5 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | SmsStatus)}
            >
              <option value="all">全部状态</option>
              <option value="delivered">已送达</option>
              <option value="sent">已发送</option>
              <option value="sending">发送中</option>
              <option value="failed">失败</option>
            </select>
            <select
              className="field w-24 py-1.5 text-xs"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | MsgType)}
            >
              <option value="all">全部类型</option>
              <option value="text">文本</option>
              <option value="image">图片</option>
            </select>
            <select
              className="field w-24 py-1.5 text-xs"
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value as "all" | "yes" | "no")}
            >
              <option value="all">全部回复</option>
              <option value="yes">已回复</option>
              <option value="no">未回复</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">目标</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">发送内容</th>
                <th className="px-3 py-3 font-medium">积分</th>
                <th className="px-3 py-3 font-medium">创建时间</th>
                <th className="px-3 py-3 font-medium">成功时间</th>
                <th className="px-3 py-3 font-medium">失败原因</th>
                <th className="px-3 py-3 font-medium">是否回复</th>
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageItems.map((r) => {
                const t = targetById(r.targetId);
                const isFollowUp = r.kind === "reply";
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-background/70 ${isFollowUp ? "bg-background/40" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className={`flex items-center gap-1.5 ${isFollowUp ? "pl-4" : ""}`}>
                        {isFollowUp && <span className="text-muted-foreground">↳</span>}
                        <span className="font-medium">{t?.name ?? "已删除目标"}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isFollowUp
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isFollowUp ? `人工回复 #${r.seq}` : "任务群发"}
                        </span>
                      </div>
                      <div className={`text-xs text-muted-foreground ${isFollowUp ? "pl-6" : ""}`}>
                        {t ? `${t.phone} · ${t.region}` : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <HoverBubble
                        label={
                          (r.msgType ?? "text") === "image"
                            ? "图片短信 · 生成图与文案"
                            : "实际发送内容"
                        }
                        original={r.content}
                        translated={r.contentZh}
                        poster={(r.msgType ?? "text") === "image"}
                      >
                        <span className="block">
                          <MsgTypePill type={r.msgType ?? "text"} />
                          <span className="mt-0.5 block max-w-40 truncate underline decoration-dotted decoration-border underline-offset-4">
                            {r.content}
                          </span>
                        </span>
                      </HoverBubble>

                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{r.credits}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                      {formatTime(r.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                      {formatTime(r.succeededAt) ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-destructive">{r.failReason ?? ""}</td>
                    <td className="px-3 py-3">
                      {r.reply ? (
                        <HoverBubble
                          label="对方回复原文"
                          original={r.reply}
                          translated={r.replyZh}
                        >
                          <span className="text-xs font-medium underline decoration-dotted decoration-border underline-offset-4">
                            是
                          </span>
                        </HoverBubble>
                      ) : (
                        <span className="text-xs text-muted-foreground">否</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.reply ? (
                        <button
                          className="btn-primary px-3 py-1.5 text-xs"
                          onClick={() => {
                            setReplyTo(r);
                            setReplyText("");
                          }}
                        >
                          回复
                        </button>
                      ) : r.seq > 1 || records.some((x) => x.threadId === r.threadId && x.seq > 1) ? (
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => {
                            setReplyTo(r);
                            setReplyText("");
                          }}
                        >
                          查看会话
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    暂无匹配的发送记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination {...pageProps} />
      </section>
    </AppShell>
  );
}
