import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "个人资料 · 短信营销管理系统" },
      {
        name: "description",
        content: "查看账号基本资料与所在企业信息，并可修改登录密码保障账号安全。",
      },
      { property: "og:title", content: "个人资料 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "查看账号基本资料与所在企业信息，并可修改登录密码保障账号安全。",
      },
    ],
  }),
  component: ProfilePage,
});

const PROFILE = {
  name: "李经理",
  short: "李经",
  account: "138****6621",
  login: "limanager",
  nickname: "李经理",
  email: "manager.li@airhui.com",
  phone: "+86 138 **** 6621",
  company: "深圳市信汇跨境电商有限公司",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-sm font-medium">{value}</div>
    </div>
  );
}

function ProfilePage() {
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) return setMsg("请填写完整密码信息");
    if (next.length < 8 || next.length > 14) return setMsg("新密码需为 8-14 位");
    if (next !== confirm) return setMsg("两次输入的新密码不一致");
    setMsg("密码更新成功（演示环境）");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <AppShell title="个人资料" subtitle="账号信息与安全设置">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex gap-2">
          {(
            [
              ["profile", "个人资料"],
              ["security", "账号安全"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? "btn-primary px-5 py-2 text-sm"
                  : "btn-ghost px-5 py-2 text-sm text-muted-foreground"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div className="panel p-6">
            <div className="flex items-center gap-4 border-b border-border pb-5">
              <div className="grid size-14 place-items-center rounded-full bg-accent font-display text-lg font-semibold text-accent-foreground">
                {PROFILE.short}
              </div>
              <div>
                <div className="font-display text-xl font-semibold">{PROFILE.name}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">账号：{PROFILE.account}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="登录账号" value={PROFILE.login} />
              <Field label="昵称" value={PROFILE.nickname} />
              <Field label="邮箱" value={PROFILE.email} />
              <Field label="手机号" value={PROFILE.phone} />
              <div className="sm:col-span-2">
                <Field label="所在企业" value={PROFILE.company} />
              </div>
            </div>
          </div>
        ) : (
          <div className="panel p-6">
            <h2 className="font-display text-lg font-semibold">修改密码</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              建议每 90 天更换一次密码。密码需为 8-14 位，且包含大写字母、小写字母、数字和特殊字符。
            </p>
            <form onSubmit={submit} className="mt-5 max-w-sm space-y-4 border-t border-border pt-5">
              <div>
                <label className="text-sm text-muted-foreground">当前密码</label>
                <input
                  type="password"
                  className="field mt-1.5 w-full"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">新密码</label>
                <input
                  type="password"
                  className="field mt-1.5 w-full"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">确认新密码</label>
                <input
                  type="password"
                  className="field mt-1.5 w-full"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
              <button type="submit" className="btn-primary px-5 py-2 text-sm">
                更新密码
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
