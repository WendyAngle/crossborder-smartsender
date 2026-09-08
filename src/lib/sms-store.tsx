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

export type SmsStatus = "sending" | "delivered" | "failed";

export type SmsRecord = {
  id: string;
  targetId: string;
  status: SmsStatus;
  content: string;
  credits: number;
  createdAt: string;
  succeededAt: string | null;
  failReason: string | null;
  reply: string | null;
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

function ts(offsetMinutes: number) {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString();
}

export function formatTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const initialTargets: Target[] = [
  { id: "t1", name: "Sophia Miller", phone: "+1 305 555 0182", region: "美国" },
  { id: "t2", name: "Carlos Mendez", phone: "+34 600 555 019", region: "西班牙" },
  { id: "t3", name: "Emma Wilson", phone: "+44 7700 555 014", region: "英国" },
  { id: "t4", name: "Ahmed Hassan", phone: "+971 50 555 0121", region: "阿联酋" },
  { id: "t5", name: "李静", phone: "+86 138 0000 0777", region: "中国" },
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
    status: "delivered",
    content: renderTemplate(initialTemplates[2]!.content, "Sophia"),
    credits: 12,
    createdAt: ts(96),
    succeededAt: ts(95),
    failReason: null,
    reply: "收到，能发一下 AirMax 42 码的库存和运费吗？",
  },
  {
    id: "r2",
    targetId: "t2",
    status: "sending",
    content: renderTemplate(initialTemplates[1]!.content, "Carlos"),
    credits: 15,
    createdAt: ts(80),
    succeededAt: null,
    failReason: null,
    reply: null,
  },
  {
    id: "r3",
    targetId: "t3",
    status: "delivered",
    content: renderTemplate(initialTemplates[2]!.content, "Emma"),
    credits: 12,
    createdAt: ts(72),
    succeededAt: ts(71),
    failReason: null,
    reply: null,
  },
  {
    id: "r4",
    targetId: "t4",
    status: "failed",
    content: renderTemplate(initialTemplates[3]!.content, "Ahmed"),
    credits: 15,
    createdAt: ts(64),
    succeededAt: null,
    failReason: "号码格式无效",
    reply: null,
  },
  {
    id: "r5",
    targetId: "t5",
    status: "delivered",
    content: renderTemplate(initialTemplates[0]!.content, "李静"),
    credits: 12,
    createdAt: ts(50),
    succeededAt: ts(49),
    failReason: null,
    reply: "好的，首单立减怎么使用？麻烦发个链接。",
  },
];

type State = {
  targets: Target[];
  templates: Template[];
  tasks: Task[];
  records: SmsRecord[];
};

type Store = State & {
  addTarget: (t: Omit<Target, "id">) => void;
  importTargets: (rows: Omit<Target, "id">[]) => number;
  updateTarget: (id: string, t: Omit<Target, "id">) => void;
  removeTarget: (id: string) => void;
  addTemplate: (t: Omit<Template, "id">) => void;
  updateTemplate: (id: string, t: Omit<Template, "id">) => void;
  removeTemplate: (id: string) => void;
  createTask: (input: { name: string; targetIds: string[]; templateId: string }) => void;
  sendReply: (recordId: string, text: string) => void;
  targetById: (id: string) => Target | undefined;
  templateById: (id: string) => Template | undefined;
};

const StoreContext = createContext<Store | null>(null);
const KEY = "sms-console-state-v1";

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
    setState((s) => ({ ...s, targets: [{ id: uid(), ...t }, ...s.targets] }));
  }, []);

  const importTargets = useCallback((rows: Omit<Target, "id">[]) => {
    setState((s) => ({
      ...s,
      targets: [...rows.map((r) => ({ id: uid(), ...r })), ...s.targets],
    }));
    return rows.length;
  }, []);

  const updateTarget = useCallback((id: string, t: Omit<Target, "id">) => {
    setState((s) => ({
      ...s,
      targets: s.targets.map((x) => (x.id === id ? { id, ...t } : x)),
    }));
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
            status: "sending",
            content,
            credits: countCredits(tpl.content),
            createdAt: now,
            succeededAt: null,
            failReason: null,
            reply: null,
          };
        });
        return { ...s, tasks: [task, ...s.tasks], records: [...records, ...s.records] };
      });
    },
    [],
  );

  const sendReply = useCallback((recordId: string, text: string) => {
    setState((s) => ({
      ...s,
      records: s.records.map((r) =>
        r.id === recordId
          ? { ...r, content: `${r.content}\n[我方回复] ${text}`, reply: r.reply }
          : r,
      ),
    }));
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
