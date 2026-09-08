import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { ReachCell } from "@/components/reach";
import { MsgTypePill } from "@/components/sms-image";
import { REACH_LABEL, formatTime, useSmsStore, type ReachStatus } from "@/lib/sms-store";

export const Route = createFileRoute("/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "任务目标明细 · 短信营销管理系统" },
      {
        name: "description",
        content: "查看单个短信营销任务触达的目标名单，包含姓名、手机号、国家/地区与触达状态。",
      },
      { property: "og:title", content: "任务目标明细 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "查看单个短信营销任务触达的目标名单，包含姓名、手机号、国家/地区与触达状态。",
      },
    ],
  }),
  component: TaskTargetsPage,
});

function TaskTargetsPage() {
  const { taskId } = Route.useParams();
  const { tasks, templateById, targetById, reachOf } = useSmsStore();
  const [query, setQuery] = useState("");
  const [reachFilter, setReachFilter] = useState<"all" | ReachStatus>("all");

  const task = tasks.find((t) => t.id === taskId);
  const template = task ? templateById(task.templateId) : undefined;

  const rows = useMemo(() => {
    if (!task) return [];
    return task.targetIds
      .map((id) => targetById(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ target: t, reach: reachOf(t.id) }));
  }, [task, targetById, reachOf]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ target: t, reach }) => {
      if (reachFilter !== "all" && reach.status !== reachFilter) return false;
      if (!q) return true;
      return [t.name, t.phone, t.region].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, reachFilter]);

  const { pageItems, props: pageProps } = usePagination(filtered, 12);

  const delivered = rows.filter((r) => r.reach.status === "delivered").length;
  const failed = rows.filter((r) => r.reach.status === "failed").length;
  const replied = rows.filter((r) => r.reach.replied).length;

  if (!task) {
    return (
      <AppShell title="任务目标明细" subtitle="任务不存在">
        <section className="panel px-5 py-16 text-center text-sm text-muted-foreground">
          没有找到该任务，可能已被删除。
          <div className="mt-4">
            <Link to="/tasks" className="btn-ghost px-3 py-1.5 text-xs">
              返回任务列表
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title={task.name} subtitle="任务触达目标明细">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Link to="/tasks" className="btn-ghost px-3 py-1.5 text-xs">
          ← 返回任务列表
        </Link>
        <span>发信模板：{template?.name ?? "已删除模板"}</span>
        <span className="inline-flex items-center gap-1.5">
          内容类型：<MsgTypePill type={task.msgType ?? "text"} />
        </span>
        <span className="tabular-nums">创建时间：{formatTime(task.createdAt)}</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="目标数" value={String(rows.length)} tone="primary" />
        <StatCard label="已送达" value={String(delivered)} />
        <StatCard label="送达失败" value={String(failed)} />
        <StatCard label="已回复" value={String(replied)} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">目标名单</h2>
          <span className="text-xs text-muted-foreground">
            共 {rows.length} 个 · 当前筛选 {filtered.length} 个
          </span>
          <div className="ml-auto flex items-center gap-2">
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
          {pageItems.map(({ target: t, reach }) => (
            <article
              key={t.id}
              className="rounded-xl border border-border bg-background/50 p-4 transition-colors hover:bg-background"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t.name}</p>
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
