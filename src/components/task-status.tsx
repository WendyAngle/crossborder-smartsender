import { TASK_STATUS_LABEL, formatTime, type TaskStat, type TaskStatus } from "@/lib/sms-store";

export const TASK_STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string }> = {
  pending: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" },
  sending: { pill: "bg-warning-soft text-warning-foreground", dot: "bg-warning" },
  done: { pill: "bg-accent text-accent-foreground", dot: "bg-primary" },
  partial: { pill: "bg-warning-soft text-warning-foreground", dot: "bg-destructive" },
  failed: { pill: "bg-destructive-soft text-destructive", dot: "bg-destructive" },
};

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  const style = TASK_STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

/** 列表中的任务状态：徽标 + hover 展开各状态明细 */
export function TaskStatusCell({ stat, showProgress = true }: { stat: TaskStat; showProgress?: boolean }) {
  return (
    <span className="group relative inline-flex cursor-default items-center gap-1.5">
      <TaskStatusPill status={stat.status} />
      {showProgress && (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {stat.progress}%
        </span>
      )}
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-56 rounded-xl bg-ink p-3 text-left text-[11px] leading-snug text-ink-foreground/90 shadow-lg group-hover:block">
        <span className="block">目标总数 {stat.total}</span>
        <span className="mt-1 block">已送达 {stat.delivered} · 送达失败 {stat.failed}</span>
        <span className="mt-1 block">
          发送中 {stat.sending} · 已发送待回执 {stat.sent} · 未触达 {stat.untouched}
        </span>
        <span className="mt-1 block">已回复 {stat.replied}</span>
        <span className="mt-1 block text-ink-foreground/60">
          最近发送：{formatTime(stat.lastAt) ?? "—"}
        </span>
      </span>
    </span>
  );
}

/** 任务进度条：已出结果（送达 + 失败）占比 */
export function TaskProgressBar({ stat }: { stat: TaskStat }) {
  const pct = (n: number) => (stat.total === 0 ? 0 : (n / stat.total) * 100);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <span className="bg-primary" style={{ width: `${pct(stat.delivered)}%` }} />
      <span className="bg-destructive" style={{ width: `${pct(stat.failed)}%` }} />
      <span className="bg-warning" style={{ width: `${pct(stat.sending + stat.sent)}%` }} />
    </div>
  );
}
