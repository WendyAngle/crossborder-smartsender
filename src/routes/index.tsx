import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import {
  formatTime,
  useSmsStore,
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
  delivered: "已送达",
  failed: "失败",
};

function StatusPill({ status }: { status: SmsStatus }) {
  const cls =
    status === "delivered"
      ? "bg-accent text-accent-foreground"
      : status === "sending"
        ? "bg-warning-soft text-warning-foreground"
        : "bg-destructive-soft text-destructive";
  const dot =
    status === "delivered" ? "bg-primary" : status === "sending" ? "bg-warning" : "bg-destructive";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function DetailsPage() {
  const { records, targetById, sendReply } = useSmsStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SmsStatus>("all");
  const [replyFilter, setReplyFilter] = useState<"all" | "yes" | "no">("all");
  const [replyTo, setReplyTo] = useState<SmsRecord | null>(null);
  const [replyText, setReplyText] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (replyFilter === "yes" && !r.reply) return false;
      if (replyFilter === "no" && r.reply) return false;
      if (!q) return true;
      const t = targetById(r.targetId);
      return (
        (t?.name ?? "").toLowerCase().includes(q) ||
        (t?.phone ?? "").toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    });
  }, [records, query, statusFilter, replyFilter, targetById]);

  const { pageItems, props: pageProps } = usePagination(filtered);

  const delivered = records.filter((r) => r.status === "delivered").length;
  const replies = records.filter((r) => r.reply).length;
  const credits = records.reduce((s, r) => s + (r.status === "failed" ? 0 : r.credits), 0);

  return (
    <AppShell
      title="短信明细"
      subtitle="跨境营销发送记录"
      drawer={
        replyTo ? (
          <Drawer
            title="回复客户"
            hint={targetById(replyTo.targetId)?.name}
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
                  发送回复
                </button>
              </>
            }
          >
            <div>
              <div className="text-xs font-medium text-muted-foreground">对方回复</div>
              <div className="mt-1.5 rounded-xl bg-background p-3 text-[13px] leading-relaxed">
                {replyTo.reply}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">回复内容</label>
              <textarea
                className="field mt-1.5 min-h-32 resize-y"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="输入回复内容…"
              />
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
              <option value="sending">发送中</option>
              <option value="failed">失败</option>
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
                return (
                  <tr key={r.id} className="transition-colors hover:bg-background/70">
                    <td className="px-5 py-3">
                      <div className="font-medium">{t?.name ?? "已删除目标"}</div>
                      <div className="text-xs text-muted-foreground">
                        {t ? `${t.phone} · ${t.region}` : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="max-w-40 truncate px-3 py-3 text-muted-foreground" title={r.content}>
                      {r.content}
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
                        <span className="group relative inline-flex items-center gap-1 text-xs font-medium">
                          是
                          <span className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg bg-ink p-2.5 text-[11px] leading-snug text-ink-foreground/90 shadow-lg group-hover:block">
                            {r.reply}
                          </span>
                        </span>
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
      </section>
    </AppShell>
  );
}
