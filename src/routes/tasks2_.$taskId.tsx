import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { ReachCell } from "@/components/reach";
import { ReplyDrawer } from "@/components/reply-drawer";
import { MsgTypePill } from "@/components/sms-image";
import { TaskProgressBar, TaskStatusPill } from "@/components/task-status";
import {
  REACH_LABEL,
  formatTime,
  renderTemplate,
  useSmsStore,
  type Reach,
  type ReachStatus,
  type SmsRecord,
} from "@/lib/sms-store";

export const Route = createFileRoute("/tasks2_/$taskId")({
  head: () => ({
    meta: [
      { title: "任务目标名单 · 任务管理2" },
      {
        name: "description",
        content: "任务管理2 的任务详情：目标名单触达状态、未读回复提醒，并可直接打开会话与回复。",
      },
      { property: "og:title", content: "任务目标名单 · 任务管理2" },
      {
        property: "og:description",
        content: "任务管理2 的任务详情：目标名单触达状态、未读回复提醒，并可直接打开会话与回复。",
      },
    ],
  }),
  component: Task2TargetsPage,
});

function Task2TargetsPage() {
  const { taskId } = Route.useParams();
  const { tasks, templateById, targetById, taskRecords, taskStatOf, markReplyRead } = useSmsStore();
  const [query, setQuery] = useState("");
  const [reachFilter, setReachFilter] = useState<"all" | ReachStatus>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [replyTo, setReplyTo] = useState<SmsRecord | null>(null);

  const task = tasks.find((t) => t.id === taskId);
  const template = task ? templateById(task.templateId) : undefined;

  const records = useMemo(() => (task ? taskRecords(task.id) : []), [task, taskRecords]);
  const stat = useMemo(() => (task ? taskStatOf(task) : null), [task, taskStatOf]);

  const rows = useMemo(() => {
    if (!task) return [];
    return task.targetIds
      .map((id) => targetById(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => {
        const mine = records
          .filter((r) => r.targetId === t.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const unread = mine.filter((r) => r.reply && !r.replyRead).length;
        return {
          target: t,
          reach: reachInTask(mine),
          unread,
          // 优先打开有未读回复的记录，其次打开最新一条
          latest: mine.find((r) => r.reply && !r.replyRead) ?? mine[0] ?? null,
        };
      });
  }, [task, targetById, records]);

  const unreadTotal = rows.reduce((s, r) => s + r.unread, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ target: t, reach, unread }) => {
      if (unreadOnly && unread === 0) return false;
      if (reachFilter !== "all" && reach.status !== reachFilter) return false;
      if (!q) return true;
      return [t.name, t.phone, t.region].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, reachFilter, unreadOnly]);

  const { pageItems, props: pageProps } = usePagination(filtered, 12);

  if (!task) {
    return (
      <AppShell title="任务目标名单" subtitle="任务不存在">
        <section className="panel px-5 py-16 text-center text-sm text-muted-foreground">
          没有找到该任务，可能已被删除。
          <div className="mt-4">
            <Link to="/tasks2" className="btn-ghost px-3 py-1.5 text-xs">
              返回任务管理2
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={task.name}
      subtitle="任务详情与回复跟进"
      drawer={
        replyTo ? <ReplyDrawer record={replyTo} onClose={() => setReplyTo(null)} /> : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Link to="/tasks2" className="btn-ghost px-3 py-1.5 text-xs">
          ← 返回任务管理2
        </Link>
        {stat && <TaskStatusPill status={stat.status} />}
        <span>发信模板：{template?.name ?? "已删除模板"}</span>
        <span className="inline-flex items-center gap-1.5">
          内容类型：<MsgTypePill type={task.msgType ?? "text"} />
        </span>
        <span>跟进回复：{(task.followUp ?? true) ? "是（积分 1.5 倍）" : "否"}</span>
        <span className="tabular-nums">创建时间：{formatTime(task.createdAt)}</span>
        <span className="tabular-nums">最近发送：{formatTime(stat?.lastAt ?? null) ?? "—"}</span>
      </div>

      {stat && (
        <section className="panel mb-5 px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-[15px] font-semibold">发送进度</h2>
            <span className="text-xs text-muted-foreground">
              已出结果 {stat.delivered + stat.failed} / {stat.total} 个目标 · 消耗 {stat.credits} 积分
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums text-primary">
              {stat.progress}%
            </span>
          </div>
          <div className="mt-3">
            <TaskProgressBar stat={stat} />
          </div>
        </section>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="目标数" value={String(stat?.total ?? rows.length)} tone="primary" />
        <StatCard label="已回复" value={String(stat?.replied ?? 0)} />
        <StatCard label="待跟进（未读）" value={String(unreadTotal)} tone="danger" />
        <StatCard label="送达失败" value={String(stat?.failed ?? 0)} />
      </div>

      {template && (
        <section className="panel mb-5 px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">发信内容</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-background p-3 text-[13px] leading-relaxed text-foreground/80">
            {renderTemplate(template.content, "客户", task.varValues)}
          </p>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">目标名单</h2>
          <span className="text-xs text-muted-foreground">
            共 {rows.length} 个 · 当前筛选 {filtered.length} 个 · 点击卡片查看会话与回复
          </span>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-[hsl(var(--primary))]"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  pageProps.onPage(1);
                }}
              />
              仅看未读回复
            </label>
            <input
              className="field w-52 py-1.5 text-xs"
              placeholder="搜索姓名 / 手机号 / 地区"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                pageProps.onPage(1);
              }}
            />
            <select
              className="field w-28 py-1.5 text-xs"
              value={reachFilter}
              onChange={(e) => {
                setReachFilter(e.target.value as "all" | ReachStatus);
                pageProps.onPage(1);
              }}
            >
              <option value="all">全部状态</option>
              {(Object.keys(REACH_LABEL) as ReachStatus[]).map((s) => (
                <option key={s} value={s}>
                  {REACH_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map(({ target: t, reach, unread, latest }) => (
            <article
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!latest) return;
                markReplyRead(latest.id);
                setReplyTo(latest);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && latest) {
                  e.preventDefault();
                  markReplyRead(latest.id);
                  setReplyTo(latest);
                }
              }}
              className={`rounded-xl border bg-background/50 p-4 text-left transition-colors ${
                latest ? "cursor-pointer hover:bg-background" : "cursor-not-allowed opacity-70"
              } ${unread > 0 ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    {t.name}
                    {unread > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground tabular-nums">
                        {unread} 条未读
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{t.phone}</p>
                </div>
                <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.region}
                </span>
              </div>
              <div className="mt-3">
                <ReachCell
                  status={reach.status}
                  lastAt={reach.lastAt}
                  failReason={reach.failReason}
                  count={reach.count}
                  replied={reach.replied}
                />
              </div>
              {unread > 0 && latest?.reply && (
                <p className="mt-2 line-clamp-2 rounded-lg bg-card px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
                  待跟进：{latest.replyZh ?? latest.reply}
                </p>
              )}
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              暂无匹配的目标，可调整搜索或状态筛选
            </p>
          )}
        </div>

        <Pagination {...pageProps} unit="个" />
      </section>
    </AppShell>
  );
}

/** 只在本任务的短信明细内推导某个目标的触达状态（mine 已按时间倒序） */
function reachInTask(mine: SmsRecord[]): Reach {
  const last = mine[0];
  if (!last) {
    return { status: "untouched", lastAt: null, failReason: null, replied: false, count: 0 };
  }
  return {
    status: last.status,
    lastAt: last.createdAt,
    failReason: last.failReason,
    replied: mine.some((r) => !!r.reply),
    count: mine.length,
  };
}
