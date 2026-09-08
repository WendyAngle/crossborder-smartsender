import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Target = {
  id: string;
  name: string;
  phone: string;
  region: string;
};

export type Template = {
  id: string;
  name: string;
  content: string;
};

export type Task = {
  id: string;
  name: string;
  targetIds: string[];
  templateId: string;
  createdAt: string;
};

/**
 * sending  = 提交网关中
 * sent     = 已发送（网关提交成功，未收到运营商送达回执）
 * delivered= 已送达（收到终端送达回执）
 * failed   = 发送/送达失败
 */
export type SmsStatus = "sending" | "sent" | "delivered" | "failed";

/** 目标维度的最近触达状态，由短信明细推导，不作为目标的静态字段存储 */
export type ReachStatus = "untouched" | "sending" | "sent" | "delivered" | "failed";

export type Reach = {
  status: ReachStatus;
  lastAt: string | null;
  failReason: string | null;
  replied: boolean;
  count: number;
};

/** campaign = 任务群发首条；reply = 我方针对客户回复的人工跟进（同一会话内的新一条短信） */
export type SmsKind = "campaign" | "reply";

export type SmsRecord = {
  id: string;
  targetId: string;
  /** 同一目标的一次对话，群发首条与后续人工回复共用同一个 threadId */
  threadId: string;
  kind: SmsKind;
  /** 会话内序号，从 1 开始 */
  seq: number;
  status: SmsStatus;
  /** 实际发送内容（目标所在国家/地区语言） */
  content: string;
  /** 中文译文，仅当发送内容非中文时提供 */
  contentZh: string | null;
  credits: number;
  createdAt: string;
  succeededAt: string | null;
  failReason: string | null;
  /** 对方回复原文 */
  reply: string | null;
  /** 对方回复中文译文 */
  replyZh: string | null;
  replyAt: string | null;
};

export const VARIABLES = [
  { token: "{联系人}", label: "联系人" },
  { token: "{我方产品}", label: "我方产品" },
  { token: "{官网链接}", label: "官网链接" },
  { token: "{其他链接}", label: "其他链接" },
] as const;

const SAMPLE_VALUES: Record<string, string> = {
  "{我方产品}": "AirMax 跨境直邮专线",
  "{官网链接}": "airhui.shop",
  "{其他链接}": "airhui.shop/promo",
};

/** 手机号格式校验：可选 + 开头，仅允许数字与空格 / - / ( )，有效数字位数 7-15 位 */
export function isValidPhone(phone: string) {
  const raw = phone.trim();
  if (!raw) return false;
  if (!/^\+?[\d\s\-()]+$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export const digitsOf = (phone: string) => phone.replace(/\D/g, "");

export function isValidTargetRow(row: { name: string; phone: string }) {
  return row.name.trim().length > 0 && row.name.trim().length <= 60 && isValidPhone(row.phone);
}

export function renderTemplate(content: string, contactName = "Sophia") {
  let out = content.replaceAll("{联系人}", contactName);
  for (const [token, value] of Object.entries(SAMPLE_VALUES)) {
    out = out.replaceAll(token, value);
  }
  return out;
}

export function countCredits(content: string) {
  const len = renderTemplate(content).length;
  return Math.max(1, Math.ceil(len / 70)) * 12;
}

// 固定基准时间，避免服务端与浏览器渲染出不同的示例时间
const MOCK_BASE = Date.parse("2026-09-08T09:00:00Z");

function ts(offsetMinutes: number) {
  return new Date(MOCK_BASE - offsetMinutes * 60_000).toISOString();
}

export function formatTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const initialTargets: Target[] = [
  { id: "t1", name: "Sophia Miller", phone: "+1 305 555 0182", region: "美国" },
  { id: "t2", name: "Carlos Mendez", phone: "+34 600 555 019", region: "西班牙" },
  { id: "t3", name: "Emma Wilson", phone: "+44 7700 555 014", region: "英国" },
  { id: "t4", name: "Ahmed Hassan", phone: "+971 50 555 0121", region: "阿联酋" },
  { id: "t5", name: "李静", phone: "+86 138 0000 0777", region: "中国" },
  { id: "t6", name: "Hans Müller", phone: "+49 170 555 0234", region: "德国" },
  { id: "t7", name: "Marie Dubois", phone: "+33 6 55 50 12 34", region: "法国" },
  { id: "t8", name: "Luca Rossi", phone: "+39 333 555 0456", region: "意大利" },
  { id: "t9", name: "Yuki Tanaka", phone: "+81 90 5550 0789", region: "日本" },
  { id: "t10", name: "Kim Min-jun", phone: "+82 10 5550 0567", region: "韩国" },
  { id: "t11", name: "Raj Patel", phone: "+91 98765 43210", region: "印度" },
  { id: "t12", name: "Olivia Smith", phone: "+61 412 555 098", region: "澳大利亚" },
  { id: "t13", name: "Siti Binti Abdullah", phone: "+60 12 555 0678", region: "马来西亚" },
  { id: "t14", name: "Nguyen Van An", phone: "+84 98 555 0321", region: "越南" },
  { id: "t15", name: "王伟", phone: "+86 139 0000 0888", region: "中国" },
  { id: "t16", name: "Chen Wei Ling", phone: "+65 9123 4567", region: "新加坡" },
  { id: "t17", name: "Anastasia Ivanova", phone: "+7 915 555 0456", region: "俄罗斯" },
  { id: "t18", name: "Pedro Almeida", phone: "+55 11 95550 1234", region: "巴西" },
];

const initialTemplates: Template[] = [
  {
    id: "tpl1",
    name: "新客首单立减",
    content: "【信汇】{联系人}，首单立减 30 元，{我方产品} 限时开启，点击 {官网链接} 抢购 →",
  },
  {
    id: "tpl2",
    name: "限时折扣",
    content: "【信汇】{联系人}，跨境直邮 5 折限时开启，详情见 {其他链接}",
  },
  {
    id: "tpl3",
    name: "到货提醒",
    content: "【信汇】{联系人}，您关注的 {我方产品} 已到货，前往 {官网链接} 查看库存。",
  },
  {
    id: "tpl4",
    name: "物流延误说明",
    content: "【信汇】{联系人}，您的包裹因清关延误，最新进度请查询 {官网链接}。",
  },
];

const initialTasks: Task[] = [
  {
    id: "task1",
    name: "跨境促销 · 新客群",
    targetIds: ["t1", "t3", "t5"],
    templateId: "tpl1",
    createdAt: ts(180),
  },
  {
    id: "task2",
    name: "欧洲区 · 限时折扣",
    targetIds: ["t2"],
    templateId: "tpl2",
    createdAt: ts(120),
  },
];

const initialRecords: SmsRecord[] = [
  {
    id: "r1",
    targetId: "t1",
    threadId: "th1",
    kind: "campaign",
    seq: 1,
    status: "delivered",
    content:
      "[AirHui] Hi Sophia, the AirMax cross-border line you follow is back in stock. Check availability: airhui.shop",
    contentZh: "【信汇】Sophia，您关注的 AirMax 跨境直邮专线已到货，前往 airhui.shop 查看库存。",
    credits: 12,
    createdAt: ts(96),
    succeededAt: ts(95),
    failReason: null,
    reply: "Got it. Could you send stock and shipping cost for AirMax US 9?",
    replyZh: "收到，能发一下 AirMax 美码 9 的库存和运费吗？",
    replyAt: ts(90),
  },
  {
    id: "r1b",
    targetId: "t1",
    threadId: "th1",
    kind: "reply",
    seq: 2,
    status: "delivered",
    content: "[AirHui] US 9 in stock: 26 pairs. Flat shipping $6.9, delivery 5-7 days. Order: airhui.shop/promo",
    contentZh: "【信汇】美码 9 现货 26 双，运费统一 6.9 美元，5-7 天到达。下单：airhui.shop/promo",
    credits: 12,
    createdAt: ts(86),
    succeededAt: ts(85),
    failReason: null,
    reply: "Perfect, I just placed the order. Thanks!",
    replyZh: "很好，我已经下单了，谢谢！",
    replyAt: ts(70),
  },
  {
    id: "r2",
    targetId: "t2",
    threadId: "th2",
    kind: "campaign",
    seq: 1,
    status: "sending",
    content: "[AirHui] Carlos, envío directo transfronterizo al 50% por tiempo limitado. Más info: airhui.shop/promo",
    contentZh: "【信汇】Carlos，跨境直邮 5 折限时开启，详情见 airhui.shop/promo",
    credits: 15,
    createdAt: ts(80),
    succeededAt: null,
    failReason: null,
    reply: null,
    replyZh: null,
    replyAt: null,
  },
  {
    id: "r3",
    targetId: "t3",
    threadId: "th3",
    kind: "campaign",
    seq: 1,
    status: "delivered",
    content: "[AirHui] Emma, the AirMax line you watched is back in stock. View stock at airhui.shop",
    contentZh: "【信汇】Emma，您关注的 AirMax 跨境直邮专线已到货，前往 airhui.shop 查看库存。",
    credits: 12,
    createdAt: ts(72),
    succeededAt: ts(71),
    failReason: null,
    reply: null,
    replyZh: null,
    replyAt: null,
  },
  {
    id: "r4",
    targetId: "t9",
    threadId: "th4",
    kind: "campaign",
    seq: 1,
    status: "delivered",
    content:
      "【信匯】Yukiさん、初回ご注文が30元OFF。AirMax越境直送便を期間限定で公開中、airhui.shop へ →",
    contentZh: "【信汇】Yuki，首单立减 30 元，AirMax 跨境直邮专线限时开启，点击 airhui.shop 抢购 →",
    credits: 12,
    createdAt: ts(64),
    succeededAt: ts(63),
    failReason: null,
    reply: "クーポンは会員登録なしでも使えますか？",
    replyZh: "优惠券不注册会员也能使用吗？",
    replyAt: ts(58),
  },
  {
    id: "r6",
    targetId: "t6",
    threadId: "th5",
    kind: "campaign",
    seq: 1,
    status: "delivered",
    content:
      "[AirHui] Hans, Ihr Paket verzögert sich in der Zollabwicklung. Aktueller Status: airhui.shop",
    contentZh: "【信汇】Hans，您的包裹因清关延误，最新进度请查询 airhui.shop。",
    credits: 12,
    createdAt: ts(56),
    succeededAt: ts(55),
    failReason: null,
    reply: null,
    replyZh: null,
    replyAt: null,
  },
  {
    id: "r5",
    targetId: "t5",
    threadId: "th6",
    kind: "campaign",
    seq: 1,
    status: "delivered",
    content: "【信汇】李静，首单立减 30 元，AirMax 跨境直邮专线限时开启，点击 airhui.shop 抢购 →",
    contentZh: null,
    credits: 12,
    createdAt: ts(50),
    succeededAt: ts(49),
    failReason: null,
    reply: "好的，首单立减怎么使用？麻烦发个链接。",
    replyZh: null,
    replyAt: ts(44),
  },
  {
    id: "r7",
    targetId: "t7",
    threadId: "th7",
    kind: "campaign",
    seq: 1,
    status: "sent",
    content:
      "[AirHui] Marie, -30 € sur votre première commande. Ligne directe AirMax en édition limitée : airhui.shop",
    contentZh: "【信汇】Marie，首单立减 30 元，AirMax 跨境直邮专线限时开启，点击 airhui.shop 抢购 →",
    credits: 12,
    createdAt: ts(42),
    succeededAt: null,
    failReason: null,
    reply: null,
    replyZh: null,
    replyAt: null,
  },
  {
    id: "r8",
    targetId: "t12",
    threadId: "th8",
    kind: "campaign",
    seq: 1,
    status: "sent",
    content: "[AirHui] Olivia, 50% off cross-border direct shipping, limited time. Details: airhui.shop/promo",
    contentZh: "【信汇】Olivia，跨境直邮 5 折限时开启，详情见 airhui.shop/promo",
    credits: 15,
    createdAt: ts(36),
    succeededAt: null,
    failReason: null,
    reply: null,
    replyZh: null,
    replyAt: null,
  },
  {
    id: "r9",
    targetId: "t11",
    threadId: "th9",
    kind: "campaign",
    seq: 1,
    status: "failed",
    content: "[AirHui] Raj, the AirMax line you follow is back in stock. Check availability: airhui.shop",
    contentZh: "【信汇】Raj，您关注的 AirMax 跨境直邮专线已到货，前往 airhui.shop 查看库存。",
    credits: 12,
    createdAt: ts(30),
    succeededAt: null,
    failReason: "当地运营商拦截（空号或停机）",
    reply: null,
    replyZh: null,
    replyAt: null,
  },
];

type State = {
  targets: Target[];
  templates: Template[];
  tasks: Task[];
  records: SmsRecord[];
};

type Store = State & {
  addTarget: (t: Omit<Target, "id">) => boolean;
  importTargets: (rows: Omit<Target, "id">[]) => ImportResult;
  updateTarget: (id: string, t: Omit<Target, "id">) => boolean;
  removeTarget: (id: string) => void;
  addTemplate: (t: Omit<Template, "id">) => void;
  updateTemplate: (id: string, t: Omit<Template, "id">) => void;
  removeTemplate: (id: string) => void;
  createTask: (input: { name: string; targetIds: string[]; templateId: string }) => void;
  sendReply: (recordId: string, text: string) => void;
  threadRecords: (threadId: string) => SmsRecord[];
  /** 由短信明细推导的目标最近触达状态 */
  reachOf: (targetId: string) => Reach;
  targetById: (id: string) => Target | undefined;
  templateById: (id: string) => Template | undefined;
};

export type ImportResult = { added: number; invalid: number; duplicated: number };

const StoreContext = createContext<Store | null>(null);
const KEY = "sms-console-state-v4";

export const REACH_LABEL: Record<ReachStatus, string> = {
  untouched: "未触达",
  sending: "发送中",
  sent: "已发送",
  delivered: "已送达",
  failed: "送达失败",
};

/** 取该目标最近一条外发短信的状态作为触达状态 */
export function computeReach(targetId: string, records: SmsRecord[]): Reach {
  const mine = records
    .filter((r) => r.targetId === targetId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

const uid = () => Math.random().toString(36).slice(2, 10);

export function SmsStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    targets: initialTargets,
    templates: initialTemplates,
    tasks: initialTasks,
    records: initialRecords,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as State);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const addTarget = useCallback((t: Omit<Target, "id">) => {
    if (!isValidTargetRow(t)) return false;
    setState((s) => ({
      ...s,
      targets: [{ id: uid(), ...t, phone: t.phone.trim() }, ...s.targets],
    }));
    return true;
  }, []);

  const importTargets = useCallback((rows: Omit<Target, "id">[]) => {
    const result: ImportResult = { added: 0, invalid: 0, duplicated: 0 };
    setState((s) => {
      const seen = new Set(s.targets.map((t) => digitsOf(t.phone)));
      const accepted: Target[] = [];
      for (const r of rows) {
        if (!isValidTargetRow(r)) {
          result.invalid += 1;
          continue;
        }
        const key = digitsOf(r.phone);
        if (seen.has(key)) {
          result.duplicated += 1;
          continue;
        }
        seen.add(key);
        accepted.push({ id: uid(), ...r, phone: r.phone.trim() });
      }
      result.added = accepted.length;
      if (accepted.length === 0) return s;
      return { ...s, targets: [...accepted, ...s.targets] };
    });
    return result;
  }, []);

  const updateTarget = useCallback((id: string, t: Omit<Target, "id">) => {
    if (!isValidTargetRow(t)) return false;
    setState((s) => ({
      ...s,
      targets: s.targets.map((x) => (x.id === id ? { id, ...t, phone: t.phone.trim() } : x)),
    }));
    return true;
  }, []);

  const removeTarget = useCallback((id: string) => {
    setState((s) => ({ ...s, targets: s.targets.filter((x) => x.id !== id) }));
  }, []);

  const addTemplate = useCallback((t: Omit<Template, "id">) => {
    setState((s) => ({ ...s, templates: [{ id: uid(), ...t }, ...s.templates] }));
  }, []);

  const updateTemplate = useCallback((id: string, t: Omit<Template, "id">) => {
    setState((s) => ({
      ...s,
      templates: s.templates.map((x) => (x.id === id ? { id, ...t } : x)),
    }));
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setState((s) => ({ ...s, templates: s.templates.filter((x) => x.id !== id) }));
  }, []);

  const createTask = useCallback(
    ({ name, targetIds, templateId }: { name: string; targetIds: string[]; templateId: string }) => {
      setState((s) => {
        const tpl = s.templates.find((t) => t.id === templateId);
        if (!tpl) return s;
        const now = new Date().toISOString();
        const task: Task = { id: uid(), name, targetIds, templateId, createdAt: now };
        const records: SmsRecord[] = targetIds.map((tid) => {
          const target = s.targets.find((t) => t.id === tid);
          const content = renderTemplate(tpl.content, target?.name ?? "客户");
          return {
            id: uid(),
            targetId: tid,
            threadId: uid(),
            kind: "campaign",
            seq: 1,
            status: "sending",
            content,
            contentZh: null,
            credits: countCredits(tpl.content),
            createdAt: now,
            succeededAt: null,
            failReason: null,
            reply: null,
            replyZh: null,
            replyAt: null,
          };
        });
        return { ...s, tasks: [task, ...s.tasks], records: [...records, ...s.records] };
      });
    },
    [],
  );

  /** 我方跟进回复：在同一会话内新增一条外发短信记录，不覆盖原记录 */
  const sendReply = useCallback((recordId: string, text: string) => {
    setState((s) => {
      const src = s.records.find((r) => r.id === recordId);
      if (!src) return s;
      const seq =
        Math.max(...s.records.filter((r) => r.threadId === src.threadId).map((r) => r.seq)) + 1;
      const now = new Date().toISOString();
      const followUp: SmsRecord = {
        id: uid(),
        targetId: src.targetId,
        threadId: src.threadId,
        kind: "reply",
        seq,
        status: "sending",
        content: text,
        contentZh: null,
        credits: countCredits(text),
        createdAt: now,
        succeededAt: null,
        failReason: null,
        reply: null,
        replyZh: null,
        replyAt: null,
      };
      return { ...s, records: [followUp, ...s.records] };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      addTarget,
      importTargets,
      updateTarget,
      removeTarget,
      addTemplate,
      updateTemplate,
      removeTemplate,
      createTask,
      sendReply,
      threadRecords: (threadId) =>
        state.records.filter((r) => r.threadId === threadId).sort((a, b) => a.seq - b.seq),
      targetById: (id) => state.targets.find((t) => t.id === id),
      templateById: (id) => state.templates.find((t) => t.id === id),
    }),
    [
      state,
      addTarget,
      importTargets,
      updateTarget,
      removeTarget,
      addTemplate,
      updateTemplate,
      removeTemplate,
      createTask,
      sendReply,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSmsStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSmsStore must be used inside SmsStoreProvider");
  return ctx;
}

export function autoTaskName() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · 跨境营销任务`;
}
