import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AppShell, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { ReplyDrawer } from "@/components/reply-drawer";
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
  const { records, targetById, markReplyRead } = useSmsStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SmsStatus>("all");
  const [replyFilter, setReplyFilter] = useState<"all" | "yes" | "no">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | MsgType>("all");
  const [replyTo, setReplyTo] = useState<SmsRecord | null>(null);


  type Row = {
    key: string;
    record: SmsRecord;
    role: "receiver" | "sender";
    content: string;
    contentZh: string | null;
    msgType: MsgType;
    time: string;
  };

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
    // 一条内容一条记录：我方外发与对方回复各自独立成行
    const rows: Row[] = [];
    for (const r of list) {
      rows.push({
        key: `${r.id}-out`,
        record: r,
        role: "receiver",
        content: r.content,
        contentZh: r.contentZh,
        msgType: r.msgType ?? "text",
        time: r.createdAt,
      });
      if (r.reply) {
        rows.push({
          key: `${r.id}-reply`,
          record: r,
          role: "sender",
          content: r.reply,
          contentZh: r.replyZh,
          msgType: "text",
          time: r.replyAt ?? r.createdAt,
        });
      }
    }
    // 全部记录统一按创建时间倒序
    return rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [records, query, statusFilter, replyFilter, typeFilter, targetById]);

  const { pageItems, props: pageProps } = usePagination(filtered);


  const delivered = records.filter((r) => r.status === "delivered").length;
  const replies = records.filter((r) => r.reply).length;
  const credits = records.reduce((s, r) => s + (r.status === "failed" ? 0 : r.credits), 0);

  return (
    <AppShell
      title="短信明细"
      subtitle="跨境营销发送记录"
      drawer={
        replyTo ? <ReplyDrawer record={replyTo} onClose={() => setReplyTo(null)} /> : null
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
                <th className="px-3 py-3 font-medium">目标角色</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">发送内容</th>
                <th className="px-3 py-3 font-medium">积分</th>
                <th className="px-3 py-3 font-medium">创建时间</th>
                <th className="px-3 py-3 font-medium">成功时间</th>
                <th className="px-3 py-3 font-medium">失败原因</th>
                <th className="px-3 py-3 font-medium">是否回复</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageItems.map((row) => {
                const r = row.record;
                const t = targetById(r.targetId);
                const isReplyRow = row.role === "sender";
                const isFollowUp = r.kind === "reply";
                return (
                  <tr
                    key={row.key}
                    className={`cursor-pointer transition-colors hover:bg-background/70 ${isReplyRow ? "bg-accent/30" : isFollowUp ? "bg-background/40" : ""}`}
                    onClick={() => {
                      markReplyRead(r.id);
                      setReplyTo(r);
                    }}

                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
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
                      <div className="text-xs text-muted-foreground">
                        {t ? `${t.phone} · ${t.region}` : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          isReplyRow
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isReplyRow ? "发送方" : "接收方"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isReplyRow ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <StatusPill status={r.status} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      <HoverBubble
                        label={
                          isReplyRow
                            ? "对方回复原文"
                            : row.msgType === "image"
                              ? "图片短信 · 生成图与文案"
                              : "实际发送内容"
                        }
                        original={row.content}
                        translated={row.contentZh}
                        poster={row.msgType === "image"}
                      >
                        <span className="block">
                          <MsgTypePill type={row.msgType} />
                          <span className="mt-0.5 block max-w-40 truncate underline decoration-dotted decoration-border underline-offset-4">
                            {row.content}
                          </span>
                        </span>
                      </HoverBubble>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {isReplyRow ? "—" : r.credits}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                      {formatTime(row.time)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                      {isReplyRow ? "—" : (formatTime(r.succeededAt) ?? "—")}
                    </td>
                    <td className="px-3 py-3 text-xs text-destructive">
                      {isReplyRow ? "" : (r.failReason ?? "")}
                    </td>
                    <td className="px-3 py-3">
                      {isReplyRow ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : r.reply ? (
                        <span className="text-xs font-medium">是</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">否</span>
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
