import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "./card-common";
import { onlineLabel, remaining, sendReasons, type PhoneCard, type Plan } from "@/lib/phone-cards";

const headers = ["手机号 / ICCID", "设备 / 卡槽", "在线 / 占用", "标签", "短信统计（发送 / 已送达 / 失败）", "电话卡资源商", "短信通道服务商", "国家/地区编码", "手机号来源", "IMS 状态", "卡业务通道", "发送能力", "接收能力", "短信服务中心", "管理状态", "是否可用于发送", "不可用原因", "每日上限", "今日使用", "最近未选中原因", "诊断时间", "下次可尝试", "初次入库时间", "最近更新", "最近同步"];
const timestamp = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
};
function Pill({ value, positive }: { value: string; positive?: boolean }) {
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs ${positive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{value}</span>;
}
const capability = (value: boolean | null | undefined) => <Pill value={value === true ? "支持" : value === false ? "不支持" : "未知"} positive={value === true} />;

export function UiccTable({ cards, plans, selected, setSelected, renderTags, actions }: {
  cards: PhoneCard[]; plans: Plan[]; selected: string[];
  setSelected: (update: (previous: string[]) => string[]) => void;
  renderTags: (ids: string[]) => ReactNode; actions: (card: PhoneCard) => ReactNode;
}) {
  return <div className="overflow-x-auto" aria-label="普通 UICC 卡列表">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-muted/30 text-xs text-muted-foreground"><tr>
        <th className="sticky left-0 z-20 bg-card p-3"><Checkbox aria-label="全选当前页电话卡" checked={cards.length > 0 && cards.every(c => selected.includes(c.id)) ? true : cards.some(c => selected.includes(c.id)) ? "indeterminate" : false} onCheckedChange={checked => setSelected(previous => checked ? [...new Set([...previous, ...cards.map(c => c.id)])] : previous.filter(id => !cards.some(c => c.id === id)))} /></th>
        {headers.map(label => <th key={label} className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}
        <th className="sticky right-0 z-20 border-l border-border bg-card px-3 py-3 font-medium">操作</th>
      </tr></thead>
      <tbody>{cards.map(card => {
        const plan = plans.find(p => p.cardId === card.id && p.active);
        const reasons = sendReasons(card, plan);
        const cells: ReactNode[] = [
          <div className="min-w-48"><p className="font-medium">{plan?.phone ?? "未回传"}</p><p className="mt-1 text-xs text-muted-foreground">{plan?.iccid || "ICCID 未回传"}</p><p className="mt-1 text-xs text-muted-foreground">{card.note}</p></div>,
          card.device, `${onlineLabel[card.online]} / ${card.busy ? "占用中" : "空闲"}`, renderTags(card.tagIds),
          <span title="短信统计尚未同步">— / — / —</span>,
          plan?.supplier || card.supplier || "未归类", plan?.channel || "未回传", plan?.country || "未知",
          <Pill value={plan?.phoneSource || "未知"} />, <Pill value={plan?.ims || "未知"} positive={plan?.ims === "已注册"} />,
          <Pill value={plan?.connection || "未知"} positive={plan?.connection === "已连接"} />,
          capability(plan?.send), capability(plan?.receive), <Pill value={plan?.smsc || "未知"} positive={plan?.smsc === "已配置"} />,
          <StatusPill status={card.status} />, <Pill value={reasons.length ? "不可用" : "可用于发送"} positive={!reasons.length} />,
          <div className="min-w-48 max-w-72 whitespace-normal text-xs leading-relaxed" title={reasons.join("；")}>{reasons.join("；") || "—"}</div>,
          plan?.limit ?? "未知",
          plan ? `${plan.used} / ${plan.limit ?? "未知"}（预占 ${plan.reserved}，剩余 ${remaining(plan) ?? "未知"}）` : "未知",
          <span className="inline-block min-w-40 max-w-60 whitespace-normal" title="历史诊断，与当前不可用原因独立">{plan?.diagnostic || "—"}</span>,
          timestamp(plan?.diagnosticAt), timestamp(plan?.retryAt), timestamp(card.firstAt), timestamp(card.updatedAt), timestamp(card.syncedAt),
        ];
        return <tr key={card.id} className="border-t border-border hover:bg-muted/30">
          <td className="sticky left-0 z-10 bg-card p-3"><Checkbox aria-label={`选择 ${card.note}`} checked={selected.includes(card.id)} onCheckedChange={checked => setSelected(previous => checked ? [...new Set([...previous, card.id])] : previous.filter(id => id !== card.id))} /></td>
          {cells.map((cell, index) => <td key={headers[index]} className="whitespace-nowrap px-4 py-4 text-xs">{cell}</td>)}
          <td className="sticky right-0 z-10 border-l border-border bg-card px-2">{actions(card)}</td>
        </tr>;
      })}</tbody>
    </table>
    {!cards.length && <p className="py-16 text-center text-muted-foreground">没有符合条件的电话卡</p>}
  </div>;
}