export type CardStatus = "enabled" | "disabled" | "blocked";
export type Online = "online" | "offline" | "unknown";
export type CardKind = "euicc" | "uicc";
export const statusLabel: Record<CardStatus, string> = { enabled: "启用", disabled: "停用", blocked: "封禁" };
export const onlineLabel: Record<Online, string> = { online: "在线", offline: "离线", unknown: "未知" };
export type Plan = {
  id: string; cardId: string; iccid: string; phone: string | null; region: string; country: string;
  carrier: string; supplier: string; channel: string; phoneSource: string; ims: string; connection: string;
  send: boolean | null; receive: boolean | null; smsc: string; image: boolean; status: CardStatus;
  active: boolean; note: string; tagIds: string[]; limit: number | null; used: number; reserved: number;
  diagnostic: string; diagnosticAt: string | null; retryAt: string | null; updatedAt: string;
};
export type PhoneCard = {
  id: string; sourceId: string; kind: CardKind; eid: string | null; note: string; device: string;
  online: Online; busy: boolean; operation: string | null; rotation: boolean; capacity: number | null;
  reserved: number; status: CardStatus; tagIds: string[]; supplier: string; sourceValid: boolean;
  firstAt: string; syncedAt: string; updatedAt: string;
};
export type CardJob = { id: string; at: string; type: string; items: { cardId: string; label: string; state: "成功" | "失败" | "结果待确认"; reason?: string }[] };
export type CardState = { cards: PhoneCard[]; plans: Plan[]; jobs: CardJob[]; activationHashes: string[] };
export function initialCardStatus(online?: string | null): CardStatus { return online === "online" ? "enabled" : "disabled"; }
export function syncCard(existing: PhoneCard | undefined, incoming: PhoneCard): PhoneCard {
  return existing ? { ...incoming, status: existing.status, note: existing.note, tagIds: existing.tagIds, firstAt: existing.firstAt } : { ...incoming, status: initialCardStatus(incoming.online) };
}
export function setLocalStatus(card: PhoneCard, status: CardStatus): PhoneCard { return { ...card, status }; }
export function availableCapacity(card: PhoneCard, plans: Plan[]): number {
  if (card.capacity === null) return 0;
  return Math.max(0, card.capacity - plans.filter(p => p.cardId === card.id).length - card.reserved);
}
export function writeReasons(card: PhoneCard, plans: Plan[]): string[] {
  const reasons: string[] = [];
  if (card.kind !== "euicc") reasons.push("普通 UICC 不支持写卡");
  if (card.status !== "enabled") reasons.push("白卡未启用或已封禁");
  if (!card.sourceValid) reasons.push("来源无效");
  if (!card.eid || !/^\d{32}$/.test(card.eid)) reasons.push("EID 数据异常");
  if (card.online !== "online") reasons.push("白卡非在线");
  if (card.busy || card.operation || card.rotation) reasons.push("白卡运行中，暂不可写入");
  if (card.capacity === null) reasons.push("容量待同步确认");
  else if (availableCapacity(card, plans) < 1) reasons.push("无可分配容量");
  return reasons;
}
export function remaining(plan: Plan): number | null { return plan.limit === null ? null : Math.max(0, plan.limit - plan.used - plan.reserved); }
export function sendReasons(card: PhoneCard, plan?: Plan): string[] {
  const reasons: string[] = [];
  if (card.status !== "enabled") reasons.push(card.status === "blocked" ? "物理卡已封禁" : "物理卡未启用");
  if (!card.sourceValid) reasons.push("来源无效");
  if (card.online !== "online") reasons.push("物理卡非在线");
  if (card.busy || card.operation || card.rotation) reasons.push("卡片运行冲突");
  if (!plan) return [...reasons, "没有已确认生效套餐"];
  if (card.kind === "euicc" && plan.status !== "enabled") reasons.push(plan.status === "blocked" ? "套餐已封禁" : "套餐未启用");
  if (!plan.active) reasons.push("套餐未生效");
  if (plan.send !== true) reasons.push(plan.send === false ? "不支持发送" : "发送能力待确认");
  if (plan.ims !== "已注册" || plan.connection !== "已连接" || plan.smsc !== "已配置") reasons.push("演示通道未就绪");
  if (remaining(plan) === null) reasons.push("额度待确认");
  else if ((remaining(plan) ?? 0) < 1) reasons.push("当日额度已用尽");
  return reasons;
}
export function autoDistribute(cards: { id: string; free: number }[], count: number): string[] {
  const pool = [...cards].sort((a,b) => a.id.localeCompare(b.id)).map(c => ({...c, assigned: 0}));
  const result: string[] = [];
  for (let i=0; i<count; i++) {
    const c = pool.filter(c => c.assigned < c.free).sort((a,b) => a.assigned-b.assigned || a.id.localeCompare(b.id))[0];
    if (!c) throw new Error("总可分配容量不足");
    c.assigned++; result.push(c.id);
  }
  return result;
}
export function activationError(value: string): string | null {
  const parts = value.trim().split("$");
  if (parts[0]?.toUpperCase() !== "LPA:1" || !parts[1] || !parts[2]) return "激活码格式错误，应为 LPA:1$地址$Matching ID";
  if (/\s/.test(value.trim()) || !/^[a-z\d.-]+(?::\d+)?$/i.test(parts[1])) return "激活码地址或内容不合法";
  return null;
}
export function activationFingerprint(value: string): string {
  const parts = value.trim().split("$");
  return [parts[0]?.toUpperCase(), parts[1]?.toLowerCase(), ...parts.slice(2)].join("$");
}
const BASE = "2026-10-08T03:29:00.000Z";
export function makeDemoCards(): CardState {
  const cards: PhoneCard[] = Array.from({length: 20}, (_,i) => {
    const online: Online = i%5===3 ? "offline" : i%5===4 ? "unknown" : "online";
    return { id: `card-${String(i+1).padStart(2,"0")}`, sourceId: `DEMO-${1001+i}`, kind: i<8 ? "euicc" : "uicc", eid: i<8 ? `890490320000000000000000${String(i+1).padStart(8,"0")}` : null, note: i<8 ? `白卡 ${String(i+1).padStart(2,"0")}` : `普通卡 ${String(i-7).padStart(2,"0")}`, device: `矩阵 ${Math.floor(i/4)+1} / 卡槽 ${i%4+1}`, online, busy: i===6, operation: null, rotation: false, capacity: i<8 ? (i===4 ? null : [6,12,4,10,0,8,16,5][i] ?? 6) : 1, reserved: 0, status: initialCardStatus(online), tagIds: [], supplier: "演示资源商", sourceValid: true, firstAt: "2026-10-01T04:00:00.000Z", syncedAt: BASE, updatedAt: BASE };
  });
  const plans: Plan[] = [];
  cards.forEach((c,i) => {
    const n = c.kind === "euicc" ? (i===2 || i===4 ? 0 : 2) : 1;
    for (let j=0;j<n;j++) plans.push({ id:`plan-${i}-${j}`, cardId:c.id, iccid:`8901260${String(i*10+j+1).padStart(13,"0")}`, phone:`+1202555${String(i*10+j+1).padStart(4,"0")}`, region: "美国", country:"US", carrier:"演示运营商", supplier:"演示套餐资源商", channel:"Local SMS Channel · 演示", phoneSource:"UICC_CNUM", ims:c.online==="online" ? "已注册":"未知", connection:c.online==="online" ? "已连接":"未知", send:true, receive:true, smsc:"已配置", image:true, status: c.kind==="uicc" ? c.status : j===0 ? "enabled":"disabled", active:j===0, note:`套餐 ${j+1}`, tagIds:[], limit:i===9 ? 0 : 40+i, used:i%7, reserved:0, diagnostic:i%2===0 ? "卡片曾未启用":"—", diagnosticAt:i%2===0 ? "2026-10-01T00:13:44.000Z":null, retryAt:null, updatedAt:BASE });
  });
  return {cards, plans, jobs:[], activationHashes:[]};
}