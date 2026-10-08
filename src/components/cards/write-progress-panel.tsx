import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhoneCards } from "@/lib/phone-card-store";
import { CardPanel } from "./card-common";

// Each item finishes ~3s after the previous one, so progress is visible after submit.
const STEP_MS = 3000;

export function WriteProgressPanel({ onClose }: { onClose: () => void }) {
  const { state } = usePhoneCards();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const jobs = state.jobs.filter((j) => j.type === "批量写卡");
  const cardName = (id: string) => state.cards.find((c) => c.id === id)?.note ?? "—";
  return (
    <CardPanel title="写卡任务进度" onClose={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
      {!jobs.length && <p className="py-12 text-center text-sm text-muted-foreground">暂无写卡任务</p>}
      {jobs.map((job) => {
        const elapsed = now - new Date(job.at).getTime();
        const states = job.items.map((it, i) => (elapsed >= (i + 1) * STEP_MS ? it.state : elapsed >= i * STEP_MS ? "写卡中" : "排队中"));
        const done = states.filter((s) => s === "成功" || s === "失败").length;
        const pct = job.items.length ? Math.round((done / job.items.length) * 100) : 100;
        const finished = done === job.items.length;
        return (
          <div key={job.id} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{new Date(job.at).toLocaleString("zh-CN")} · {job.items.length} 条</span>
              <span className={finished ? "text-primary" : "text-muted-foreground"}>{finished ? "已完成" : "进行中"} · {done}/{job.items.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-1 text-left">条目</th><th className="text-left">白卡</th><th className="text-right">状态</th></tr></thead>
              <tbody>
                {job.items.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5">{it.label}</td>
                    <td>{cardName(it.cardId)}</td>
                    <td className={`text-right ${states[i] === "成功" ? "text-primary" : states[i] === "失败" ? "text-destructive" : "text-muted-foreground"}`}>{states[i]}{it.reason ? ` · ${it.reason}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </CardPanel>
  );
}
