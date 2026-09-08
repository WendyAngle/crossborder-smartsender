import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import {
  autoTaskName,
  countCredits,
  formatTime,
  renderTemplate,
  useSmsStore,
  type Target,
} from "@/lib/sms-store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "任务管理 · 短信营销管理系统" },
      {
        name: "description",
        content: "新建短信营销任务：自动生成任务名称、选择目标群与发信模板，并预览发信内容。",
      },
      { property: "og:title", content: "任务管理 · 短信营销管理系统" },
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
  const { tasks, targets, templates, records, createTask, templateById } = useSmsStore();
  const [open, setOpen] = useState(false);
  const [taskName, setTaskName] = useState(autoTaskName());
  const [selected, setSelected] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");

  // 已送达或正在发送中的目标不可重复选择；已发送（无回执）与送达失败可再次触达
  const busyIds = new Set(
    records
      .filter((r) => r.status === "delivered" || r.status === "sending")
      .map((r) => r.targetId),
  );
  const available = targets.filter((t) => !busyIds.has(t.id));

  const template = templateById(templateId);
  const previewTarget = targets.find((t) => t.id === selected[0]);
  const preview = template
    ? renderTemplate(template.content, previewTarget?.name ?? "客户")
    : "请选择模板";

  function openDrawer() {
    setTaskName(autoTaskName());
    setSelected([]);
    setTemplateId(templates[0]?.id ?? "");
    setOpen(true);
  }


  function submit() {
    if (!taskName.trim() || selected.length === 0 || !templateId) return;
    createTask({ name: taskName.trim(), targetIds: selected, templateId });
    setOpen(false);
  }

  const totalSent = tasks.reduce((s, t) => s + t.targetIds.length, 0);
  const { pageItems, props: pageProps } = usePagination(tasks);

  return (
    <AppShell
      title="任务管理"
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
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">内容预览</label>
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
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/80 shadow-[0_0_0_1px_color-mix(in_oklab,black_5%,transparent)]">
                  {preview}
                </div>
                <div className="mt-2 text-right text-[10px] text-muted-foreground">
                  {selected.length || 0} 个目标 ·{" "}
                  {template ? countCredits(template.content) * (selected.length || 0) : 0} 积分
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
        <StatCard label="可用模板" value={String(templates.length)} />
        <StatCard label="目标名单" value={String(targets.length)} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">任务列表</h2>
          <span className="text-xs text-muted-foreground">共 {tasks.length} 条</span>
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
              <th className="px-3 py-3 font-medium">预计积分</th>
              <th className="px-5 py-3 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((task) => {
              const tpl = templateById(task.templateId);
              return (
                <tr key={task.id} className="transition-colors hover:bg-background/70">
                  <td className="px-5 py-3 font-medium">{task.name}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <Link
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {task.targetIds.length}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{tpl?.name ?? "已删除模板"}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {tpl ? countCredits(tpl.content) * task.targetIds.length : 0}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums text-muted-foreground">
                    {formatTime(task.createdAt)}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  暂无任务，点击「新建任务」开始发信
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
