import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSmsStore } from "@/lib/sms-store";

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background"
      >
        <div className="grid size-8 place-items-center rounded-full bg-accent font-display text-sm font-semibold text-accent-foreground">
          李
        </div>
        <span className="text-sm font-medium">李经理</span>
        <span className="text-[10px] text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm hover:bg-background"
          >
            个人资料
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-background"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { to: "/targets", label: "目标管理" },
  { to: "/tasks", label: "任务管理" },
  { to: "/", label: "短信明细" },
  { to: "/templates", label: "短信模板" },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  drawer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  drawer?: ReactNode | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { records } = useSmsStore();
  const usedCredits = records.reduce((sum, r) => sum + (r.status === "failed" ? 0 : r.credits), 0);
  const balance = 12480;

  return (
    <div className="flex min-h-screen bg-background font-body text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-foreground/10 bg-ink text-ink-foreground/70">
        <div className="flex h-16 items-center gap-2.5 border-b border-ink-foreground/10 px-5">
          <div className="grid size-7 place-items-center rounded-md bg-primary">
            <span className="font-display text-sm font-bold text-primary-foreground">S</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold text-ink-foreground">信汇 SMS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-foreground/40">Console</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-foreground/30">
            工作区
          </div>
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? "rail-item rail-item-active" : "rail-item"}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <span
                  className={`size-1.5 rounded-full ${active ? "bg-primary" : "bg-ink-foreground/30"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-ink-foreground/10 px-5 py-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-ink-foreground/30">
            账号积分
          </div>
          <div className="font-display text-xl font-semibold text-ink-foreground tabular-nums">
            {(balance - usedCredits).toLocaleString()}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-foreground/10">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(6, 100 - (usedCredits / balance) * 100)}%` }}
            />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
          <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="border-l border-border pl-3">
              <AccountMenu />
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">{children}</div>
          {drawer}
        </div>
      </main>
    </div>
  );
}

export function Drawer({
  title,
  hint,
  onClose,
  footer,
  children,
  width = "w-[400px]",
}: {
  title: string;
  hint?: string | undefined;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <aside
      className={`drawer-in absolute inset-y-0 right-0 flex ${width} max-w-full flex-col border-l border-border bg-card shadow-2xl`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <h2 className="font-display text-[15px] font-semibold">{title}</h2>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        <button
          onClick={onClose}
          className="ml-auto grid size-8 place-items-center rounded-lg text-sm text-muted-foreground hover:bg-background"
        >
          关闭
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
      <div className="flex items-center gap-2 border-t border-border px-5 py-4">{footer}</div>
    </aside>
  );
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "danger" | undefined;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
          tone === "primary" ? "text-primary" : tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
