import { REACH_LABEL, formatTime, type ReachStatus } from "@/lib/sms-store";

export const REACH_STYLE: Record<ReachStatus, { pill: string; dot: string }> = {
  untouched: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/40" },
  sending: { pill: "bg-warning-soft text-warning-foreground", dot: "bg-warning" },
  sent: { pill: "bg-muted text-foreground", dot: "bg-foreground/40" },
  delivered: { pill: "bg-accent text-accent-foreground", dot: "bg-primary" },
  failed: { pill: "bg-destructive-soft text-destructive", dot: "bg-destructive" },
};

export function ReachPill({ status }: { status: ReachStatus }) {
  const style = REACH_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {REACH_LABEL[status]}
    </span>
  );
}

export function ReachCell({
  status,
  lastAt,
  failReason,
  count,
  replied,
}: {
  status: ReachStatus;
  lastAt: string | null;
  failReason: string | null;
  count: number;
  replied: boolean;
}) {
  return (
    <span className="group relative inline-flex cursor-default items-center gap-1.5">
      <ReachPill status={status} />
      {replied && (
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          已回复
        </span>
      )}
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-60 rounded-xl bg-ink p-3 text-left text-[11px] leading-snug text-ink-foreground/90 shadow-lg group-hover:block">
        <span className="block">累计发送 {count} 条</span>
        <span className="mt-1 block">最近发送：{formatTime(lastAt) ?? "—"}</span>
        {status === "sent" && (
          <span className="mt-1 block text-ink-foreground/60">已提交运营商，暂未收到送达回执</span>
        )}
        {failReason && <span className="mt-1 block text-destructive">失败原因：{failReason}</span>}
        {count === 0 && (
          <span className="mt-1 block text-ink-foreground/60">尚未向该目标发送短信</span>
        )}
      </span>
    </span>
  );
}
