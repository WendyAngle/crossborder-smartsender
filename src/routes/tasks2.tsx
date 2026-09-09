import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { MsgTypePill, SmsPoster } from "@/components/sms-image";
import { TaskStatusCell } from "@/components/task-status";
import {
  autoTaskName,
  FOLLOW_UP_MULTIPLIER,
  TASK_STATUS_LABEL,
  countCredits,
  defaultVarValue,
  formatTime,
  manualVariables,
  renderTemplate,
  templateVariables,
  useSmsStore,
  type MsgType,
  type Target,
  type TaskStatus,
} from "@/lib/sms-store";


export const Route = createFileRoute("/tasks2")({
  head: () => ({
    meta: [
      { title: "任务管理2 · 短信营销管理系统" },
      {
        name: "description",
        content: "新建短信营销任务：自动生成任务名称、选择目标群与发信模板，并预览发信内容。",
      },
      { property: "og:title", content: "任务管理2 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "新建短信营销任务：自动生成任务名称、选择目标群与发信模板，并预览发信内容。",
      },
    ],
  }),
  component: TasksPage,
});

function TargetPicker({
  available,
  selected,
  setSelected,
}: {
  available: Target[];
  selected: string[];
  setSelected: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [onlySelected, setOnlySelected] = useState(false);

  const regions = useMemo(
    () => Array.from(new Set(available.map((t) => t.region))).sort(),
    [available],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((t) => {
      if (region !== "all" && t.region !== region) return false;
      if (onlySelected && !selected.includes(t.id)) return false;
      if (!q) return true;
      return [t.name, t.phone, t.region].some((v) => v.toLowerCase().includes(q));
    });
  }, [available, query, region, onlySelected, selected]);

  const { pageItems, props: pageProps } = usePagination(filtered);
  const pageIds = pageItems.map((t) => t.id);
  const pageAllOn = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  function togglePage() {
    if (pageAllOn) setSelected(selected.filter((id) => !pageIds.includes(id)));
    else setSelected(Array.from(new Set([...selected, ...pageIds])));
  }

  function selectAllFiltered() {
    setSelected(Array.from(new Set([...selected, ...filtered.map((t) => t.id)])));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-muted-foreground">选择目标</label>
        <span className="text-[11px] text-muted-foreground">
          已选 <span className="font-semibold text-primary">{selected.length}</span> / 可选{" "}
          {available.length}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        已成功发送与发送中的目标已自动过滤；可搜索、按地区筛选后批量勾选。
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          className="field min-w-40 flex-1 py-1.5 text-xs"
          placeholder="搜索姓名 / 手机号 / 地区"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="field w-28 py-1.5 text-xs"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="all">全部地区</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={pageAllOn}
            onChange={togglePage}
          />
          全选本页
        </label>
        <button
          className="font-medium text-primary hover:underline disabled:opacity-40"
          disabled={filtered.length === 0}
          onClick={selectAllFiltered}
        >
          选中当前筛选结果（{filtered.length}）
        </button>
        <button
          className="font-medium text-muted-foreground hover:underline disabled:opacity-40"
          disabled={selected.length === 0}
          onClick={() => setSelected([])}
        >
          清空已选
        </button>
        <button
          className={`ml-auto rounded-md px-2 py-0.5 font-medium ${
            onlySelected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
          }`}
          onClick={() => setOnlySelected((v) => !v)}
        >
          {onlySelected ? "查看全部" : `只看已选（${selected.length}）`}
        </button>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-border">
        <div className="divide-y divide-border">
          {pageItems.map((t) => {
            const on = selected.includes(t.id);
            return (
              <label
                key={t.id}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-xs transition-colors ${
                  on ? "bg-primary/10" : "hover:bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(t.id)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="w-24 shrink-0 truncate font-medium">{t.name}</span>
                <span className="tabular-nums text-muted-foreground">{t.phone}</span>
                <span className="ml-auto shrink-0 rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t.region}
                </span>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              没有符合条件的目标，试试调整搜索或地区筛选
            </p>
          )}
        </div>
        {filtered.length > 0 && <Pagination {...pageProps} />}
      </div>
    </div>
  );
}

function TasksPage() {
  const { tasks, targets, templates, records, createTask, templateById, taskStatOf, taskRecords } =
    useSmsStore();
  const [open, setOpen] = useState(false);
  const [taskName, setTaskName] = useState(autoTaskName());
  const [selected, setSelected] = useState<string[]>([]);
  const enabledTemplates = templates.filter((t) => t.enabled);
  const [templateId, setTemplateId] = useState(enabledTemplates[0]?.id ?? "");
  const [msgType, setMsgType] = useState<MsgType>("text");
  const [followUp, setFollowUp] = useState(true);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [varError, setVarError] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | MsgType>("all");

  // 已送达或正在发送中的目标不可重复选择；已发送（无回执）与送达失败可再次触达
  const busyIds = new Set(
    records
      .filter((r) => r.status === "delivered" || r.status === "sending")
      .map((r) => r.targetId),
  );
  const available = targets.filter((t) => t.enabled && !busyIds.has(t.id));

  const template = templateById(templateId);
  const previewTarget = targets.find((t) => t.id === selected[0]);
  const usedVars = template ? templateVariables(template.content) : [];
  const needVars = template ? manualVariables(template.content) : [];
  const missingVars = needVars.filter((v) => !(varValues[v.token] ?? "").trim());
  const preview = template
    ? renderTemplate(template.content, previewTarget?.name ?? "客户", varValues)
    : "请选择模板";

  /** 切换模板时用模板默认值初始化变量输入 */
  function pickTemplate(id: string) {
    setTemplateId(id);
    setVarError(false);
    const tpl = templateById(id);
    const next: Record<string, string> = {};
    if (tpl) for (const v of manualVariables(tpl.content)) next[v.token] = defaultVarValue(v.token);
    setVarValues(next);
  }

  function openDrawer() {
    setTaskName(autoTaskName());
    setSelected([]);
    setMsgType("text");
    setFollowUp(true);
    pickTemplate(enabledTemplates[0]?.id ?? "");
    setOpen(true);
  }

  function submit() {
    if (!taskName.trim() || selected.length === 0 || !templateId) return;
    if (missingVars.length > 0) {
      setVarError(true);
      return;
    }
    createTask({
      name: taskName.trim(),
      targetIds: selected,
      templateId,
      msgType,
      followUp,
      varValues: needVars.length > 0 ? varValues : undefined,
    });
    setOpen(false);
  }


  const rows = useMemo(
    () =>
      tasks.map((task) => ({
        task,
        stat: taskStatOf(task),
        unread: taskRecords(task.id).filter((r) => r.reply && !r.replyRead).length,
      })),
    [tasks, taskStatOf, taskRecords],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ task, stat }) => {
      if (statusFilter !== "all" && stat.status !== statusFilter) return false;
      if (typeFilter !== "all" && (task.msgType ?? "text") !== typeFilter) return false;
      if (!q) return true;
      const tplName = templateById(task.templateId)?.name ?? "";
      return [task.name, tplName].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter, typeFilter, templateById]);

  const statusCount = (s: TaskStatus) => rows.filter((r) => r.stat.status === s).length;
  const totalSent = tasks.reduce((s, t) => s + t.targetIds.length, 0);
  const { pageItems, props: pageProps } = usePagination(filtered);

  return (
    <AppShell
      title="任务管理2"
      subtitle="批量发信任务与内容预览"
      drawer={
        open ? (
          <Drawer
            title="新建任务"
            hint="草稿"
            width="w-[620px]"
            onClose={() => setOpen(false)}
            footer={
              <>
                <button className="btn-ghost px-4 py-2.5 text-sm" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={submit}>
                  发送任务
                </button>
              </>
            }
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">任务名称</label>
              <input
                className="field mt-1.5"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">系统自动生成，可手动修改</p>
            </div>

            {available.length === 0 ? (
              <p className="rounded-xl border border-border px-3 py-8 text-center text-xs text-muted-foreground">
                暂无可选目标，全部目标均已发送或发送中
              </p>
            ) : (
              <TargetPicker
                available={available}
                selected={selected}
                setSelected={(next) => setSelected(next)}
              />
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground">发信内容 · 模板</label>
              <select
                className="field mt-1.5"
                value={templateId}
                onChange={(e) => pickTemplate(e.target.value)}
              >
                {enabledTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {template && (
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  {template.content}
                </p>
              )}
            </div>

            {usedVars.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-medium text-muted-foreground">变量取值</label>
                  <span className="text-[11px] text-muted-foreground">
                    共 {usedVars.length} 个变量 · 需填写 {needVars.length} 个
                  </span>
                </div>
                <div className="mt-1.5 space-y-2 rounded-xl border border-border px-3 py-3">
                  {usedVars.map((v) => {
                    const auto = !needVars.some((n) => n.token === v.token);
                    const value = varValues[v.token] ?? "";
                    const missing = !auto && varError && !value.trim();
                    return (
                      <div key={v.token} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-[11px] font-medium text-foreground/80">
                          {v.label}
                        </span>
                        {auto ? (
                          <span className="flex-1 rounded-lg bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            按每个目标的姓名自动填充，无需填写
                          </span>
                        ) : (
                          <input
                            className={`field flex-1 py-1.5 text-xs ${
                              missing ? "border-red-500" : ""
                            }`}
                            placeholder={`请输入${v.label}`}
                            value={value}
                            onChange={(e) => {
                              setVarValues((prev) => ({ ...prev, [v.token]: e.target.value }));
                              setVarError(false);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p
                  className={`mt-1 text-[11px] ${
                    varError && missingVars.length > 0 ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {varError && missingVars.length > 0
                    ? `请先填写：${missingVars.map((v) => v.label).join("、")}`
                    : "变量取值对本任务全部目标统一生效，发送后不再变更"}
                </p>
              </div>
            )}


            <div>
              <label className="text-xs font-medium text-muted-foreground">发信内容类型</label>
              <select
                className="field mt-1.5"
                value={msgType}
                onChange={(e) => setMsgType(e.target.value as MsgType)}
              >
                <option value="text">文本</option>
                <option value="image">图片</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {msgType === "text"
                  ? "普通文本短信下发"
                  : "将模板内容排版成营销图片下发"}
                ，两种类型积分消耗相同
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">跟进回复</label>
              <label className="mt-1.5 flex cursor-pointer items-start gap-2 rounded-xl border border-border px-3 py-2.5 text-xs transition-colors hover:bg-background">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 accent-primary"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                />
                <span>
                  <span className="block font-medium">是否跟进回复</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    勾选后可对客户回复做人工跟进，单条积分为不跟进的 {FOLLOW_UP_MULTIPLIER} 倍
                  </span>
                </span>
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                内容预览 · {msgType === "text" ? "文本" : "图片"}
              </label>
              <div className="mt-1.5 rounded-xl bg-background p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>信汇 · 预览机</span>
                  <span className="tabular-nums">
                    {new Date().toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {msgType === "text" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/80 shadow-[0_0_0_1px_color-mix(in_oklab,black_5%,transparent)]">
                    {preview}
                  </div>
                ) : (
                  <div className="max-w-[75%]">
                    <SmsPoster content={preview} size="md" />
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      图片由上方模板内容自动生成，变量已按目标替换
                    </div>
                  </div>
                )}
                <div className="mt-2 text-right text-[10px] text-muted-foreground">
                  {selected.length || 0} 个目标 · {followUp ? "跟进回复" : "不跟进回复"} ·{" "}
                  {template ? countCredits(template.content, followUp) * (selected.length || 0) : 0}{" "}
                  积分
                </div>
              </div>
            </div>
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="任务总数" value={String(tasks.length)} />
        <StatCard label="累计发信" value={String(totalSent)} tone="primary" />
        <StatCard label="发送中任务" value={String(statusCount("sending"))} />
        <StatCard label="存在失败的任务" value={String(statusCount("partial") + statusCount("failed"))} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">任务列表</h2>
          <span className="text-xs text-muted-foreground">
            共 {tasks.length} 条 · 命中 {filtered.length} 条
          </span>
          <input
            className="field w-52 py-1.5 text-xs"
            placeholder="搜索任务名称 / 模板"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="field w-28 py-1.5 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | TaskStatus)}
          >
            <option value="all">全部状态</option>
            {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}（{statusCount(s)}）
              </option>
            ))}
          </select>
          <select
            className="field w-28 py-1.5 text-xs"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | MsgType)}
          >
            <option value="all">全部类型</option>
            <option value="text">文本</option>
            <option value="image">图片</option>
          </select>
          {(query || statusFilter !== "all" || typeFilter !== "all") && (
            <button
              className="text-xs font-medium text-muted-foreground hover:underline"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
            >
              重置筛选
            </button>
          )}
          <div className="ml-auto">
            <button className="btn-primary px-3 py-1.5 text-xs" onClick={openDrawer}>
              <span className="-ml-0.5 text-base leading-none">+</span> 新建任务
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">任务名称</th>
              <th className="px-3 py-3 font-medium">目标数</th>
              <th className="px-3 py-3 font-medium">发信模板</th>
              <th className="px-3 py-3 font-medium">内容类型</th>
              <th className="px-3 py-3 font-medium">跟进回复</th>
              <th className="px-3 py-3 font-medium">未读</th>
              <th className="px-3 py-3 font-medium">任务状态</th>
              <th className="px-3 py-3 font-medium">预计积分</th>
              <th className="px-3 py-3 font-medium">创建时间</th>
              <th className="px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map(({ task, stat, unread }) => {
              const tpl = templateById(task.templateId);
              return (
                <tr key={task.id} className="transition-colors hover:bg-background/70">
                  <td className="px-5 py-3 font-medium">{task.name}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <Link
                      to="/tasks2/$taskId"
                      params={{ taskId: task.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {task.targetIds.length}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{tpl?.name ?? "已删除模板"}</td>
                  <td className="px-3 py-3">
                    <MsgTypePill type={task.msgType ?? "text"} />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        (task.followUp ?? true)
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {(task.followUp ?? true) ? "跟进" : "不跟进"}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {unread > 0 ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">
                        {unread}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <TaskStatusCell stat={stat} showProgress={false} />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {tpl
                      ? countCredits(tpl.content, task.followUp ?? true) * task.targetIds.length
                      : 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {formatTime(task.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Link
                      to="/tasks2/$taskId"
                      params={{ taskId: task.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {tasks.length === 0
                    ? "暂无任务，点击「新建任务」开始发信"
                    : "没有符合筛选条件的任务，试试调整搜索或状态筛选"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination {...pageProps} />
      </section>
    </AppShell>
  );
}
