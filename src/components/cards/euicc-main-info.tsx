import type { PhoneCard, Plan } from "@/lib/phone-cards";
import { onlineLabel } from "@/lib/phone-cards";
import { CopyValue } from "./copy-value";

export function EuiccMainInfo({ card, activePlan }: { card: PhoneCard; activePlan?: Plan }) {
  const switching = card.operation ? /switch|切卡|切换/i.test(card.operation) : false;
  const fields = [
    { label: "EID", value: <CopyValue value={card.eid} label="EID" /> },
    { label: "当前生效档位", value: <CopyValue value={activePlan?.iccid} label="当前生效档位" fallback="没有" /> },
    { label: "在线", value: <span className={`inline-flex rounded border px-2 py-1 text-xs ${card.online === "online" ? "border-accent bg-accent text-accent-foreground" : "border-border bg-muted text-muted-foreground"}`}>{onlineLabel[card.online]}</span> },
    { label: "正在切卡", value: <span className="inline-flex rounded border border-border px-2 py-1 text-xs">{switching ? "进行中" : "没有"}</span> },
    { label: "正在轮换收短信", value: <span className={`inline-flex rounded border px-2 py-1 text-xs ${card.rotation ? "border-primary/20 bg-primary/10 text-primary" : "border-border"}`}>{card.rotation ? "进行中" : "没有"}</span> },
    { label: "占用", value: <span className="inline-flex rounded border border-border px-2 py-1 text-xs">{card.busy ? "占用中" : "空闲"}</span> },
  ];
  return <dl className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{fields.map(field => <div key={field.label} className="min-w-0"><dt className="mb-1.5 text-xs text-muted-foreground">{field.label}</dt><dd className="overflow-x-auto text-sm">{field.value}</dd></div>)}</dl>;
}