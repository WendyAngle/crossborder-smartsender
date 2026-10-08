import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "./card-common";
import { CopyValue } from "./copy-value";
import { remaining, sendReasons, type PhoneCard, type Plan } from "@/lib/phone-cards";

const headers = ["所属白卡", "生效状态", "手机号", "ICCID", "标签", "短信统计（发送 / 已送达 / 失败）", "套餐资源商", "短信通道服务商", "国家/地区编码", "运营商", "手机号来源", "IMS 状态", "卡业务通道", "发送能力", "接收能力", "短信服务中心", "管理状态", "是否可用于发送", "不可用原因", "每日上限", "今日使用", "最近未选中原因", "诊断时间", "下次可尝试", "最近更新"];
const timestamp = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
};
function Pill({ value, positive }: { value: string; positive?: boolean }) {
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs ${positive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{value}</span>;
}
const capability = (value: boolean | null | undefined) => <Pill value={value === true ? "支持" : value === false ? "不支持" : "未知"} positive={value === true} />;

export function PlanTable({ rows, selected, setSelected, renderTags, actions, onSwitch }: {
  rows: { plan: Plan; card: PhoneCard }[]; selected: string[];
  setSelected: (update: (previous: string[]) => string[]) => void;
  renderTags: (ids: string[]) => ReactNode;
  actions: (card: PhoneCard, plan?: Plan) => ReactNode;
  onSwitch: (card: PhoneCard, plan: Plan, active?: boolean) => void;
}) {
  return <div className="overflow-x-auto" aria-label="套餐卡号列表">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-muted/30 text-xs text-muted-foreground"><tr>
        <th className="sticky left-0 z-20 bg-card p-3"><Checkbox aria-label="全选当前页套餐卡号" checked={rows.length > 0 && rows.every(r => selected.includes(r.plan.id)) ? true : rows.some(r => selected.includes(r.plan.id)) ? "indeterminate" : false} onCheckedChange={checked => setSelected(previous => checked ? [...new Set([...previous, ...rows.map(r => r.plan.id)])] : previous.filter(id => !rows.some(r => r.plan.id === id)))} /></th>
        {headers.map(label => <th key={label} className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}
        <th className="sticky right-0 z-20 border-l border-border bg-card px-3 py-3 font-medium">操作</th>
      </tr></thead>
      <tbody>{rows.map(({ plan: p, card: c }) => {
        const reasons = sendReasons(c, p);
        const cells: ReactNode[] = [
          <div className="max-w-48">{c.note}<span className="block text-xs text-muted-foreground" title={c.eid ?? undefined}>{c.eid ? `${c.eid.slice(0, 6)}…${c.eid.slice(-8)}` : c.device}</span></div>,
          p.active ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-primary">生效<Button variant="ghost" size="sm" onClick={() => onSwitch(c, p, false)}>取消生效</Button></span> : <Button variant="ghost" size="sm" onClick={() => onSwitch(c, p)}>设为生效</Button>,
          <div className="min-w-40"><CopyValue value={p.phone} label="手机号" /><p className="mt-1 text-xs text-muted-foreground">{p.note}</p></div>,
          <CopyValue value={p.iccid} label="ICCID" fallback="ICCID 未回传" />,
          renderTags(p.tagIds),
          <span title="短信统计尚未同步">— / — / —</span>,
          p.supplier || "未归类", p.channel || "未回传", p.country || "未知", p.carrier || "未知",
          <Pill value={p.phoneSource || "未知"} />, <Pill value={p.ims || "未知"} positive={p.ims === "已注册"} />,
          <Pill value={p.connection || "未知"} positive={p.connection === "已连接"} />,
          capability(p.send), capability(p.receive), <Pill value={p.smsc || "未知"} positive={p.smsc === "已配置"} />,
          <StatusPill status={p.status} />, <Pill value={reasons.length ? "不可用" : "可用于发送"} positive={!reasons.length} />,
          <div className="min-w-48 max-w-72 whitespace-normal text-xs leading-relaxed" title={reasons.join("；")}>{reasons.join("；") || "—"}</div>,
          p.limit ?? "未知",
          p ? `${p.used} / ${p.limit ?? "未知"}（预占 ${p.reserved}，剩余 ${remaining(p) ?? "未知"}）` : "未知",
          <span className="inline-block min-w-40 max-w-60 whitespace-normal" title="历史诊断，与当前不可用原因独立">{p.diagnostic || "—"}</span>,
          timestamp(p.diagnosticAt), timestamp(p.retryAt), timestamp(p.updatedAt),
        ];
        return <tr key={p.id} className="border-t border-border hover:bg-muted/30">
          <td className="sticky left-0 z-10 bg-card p-3"><Checkbox aria-label={`选择套餐 ${p.note}`} checked={selected.includes(p.id)} onCheckedChange={checked => setSelected(previous => checked ? [...previous, p.id] : previous.filter(id => id !== p.id))} /></td>
          {cells.map((cell, index) => <td key={headers[index]} className="whitespace-nowrap px-4 py-4 text-xs">{cell}</td>)}
          <td className="sticky right-0 z-10 border-l border-border bg-card px-2">{actions(c, p)}</td>
        </tr>;
      })}</tbody>
    </table>
    {!rows.length && <p className="py-16 text-center text-muted-foreground">没有符合条件的套餐卡号</p>}
  </div>;
}
