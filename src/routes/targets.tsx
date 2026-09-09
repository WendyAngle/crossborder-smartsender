import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { isValidPhone, useSmsStore, type Target } from "@/lib/sms-store";


export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "目标管理 · 短信营销管理系统" },
      {
        name: "description",
        content: "新增、批量导入与维护短信营销目标，包含姓名、手机号与国家/地区。",
      },
      { property: "og:title", content: "目标管理 · 短信营销管理系统" },
      {
        property: "og:description",
        content: "新增、批量导入与维护短信营销目标，包含姓名、手机号与国家/地区。",
      },
    ],
  }),
  component: TargetsPage,
});


type Mode = { kind: "none" } | { kind: "single"; target?: Target | undefined } | { kind: "import" };

function TargetsPage() {
  const { targets, addTarget, updateTarget, removeTarget, importTargets, setTargetsEnabled } =
    useSmsStore();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [query, setQuery] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [bulk, setBulk] = useState("");
  const [fileName, setFileName] = useState("");
  const [formError, setFormError] = useState("");
  const [importInfo, setImportInfo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return targets.filter((t) => {
      if (enabledFilter === "enabled" && !t.enabled) return false;
      if (enabledFilter === "disabled" && t.enabled) return false;
      if (!q) return true;
      return [t.name, t.phone, t.region].some((v) => v.toLowerCase().includes(q));
    });
  }, [targets, query, enabledFilter]);

  const { pageItems, props: pageProps } = usePagination(filtered);

  // 选中项始终限定在当前筛选结果内，避免筛选后误操作看不见的数据
  const visibleIds = filtered.map((t) => t.id);
  const selected = selectedIds.filter((id) => visibleIds.includes(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const bulkStats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    for (const line of bulk.split("\n")) {
      const cols = line.split(/[,\t，]/).map((c) => c.trim());
      if (!cols[0] || !cols[1]) continue;
      if (isValidPhone(cols[1])) valid += 1;
      else invalid += 1;
    }
    return { valid, invalid };
  }, [bulk]);

  const regions = new Set(targets.map((t) => t.region)).size;
  const enabledCount = targets.filter((t) => t.enabled).length;
  const disabledCount = targets.length - enabledCount;


  function openSingle(target?: Target) {
    setName(target?.name ?? "");
    setPhone(target?.phone ?? "");
    setRegion(target?.region ?? "");
    setFormError("");
    setMode({ kind: "single", target });
  }

  function saveSingle() {
    if (!name.trim()) {
      setFormError("请填写姓名");
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError("手机号格式不正确，请填写带国际区号的号码（7-15 位数字）");
      return;
    }
    const payload = { name: name.trim(), phone: phone.trim(), region: region.trim() || "未填写" };
    const ok =
      mode.kind === "single" && mode.target
        ? updateTarget(mode.target.id, payload)
        : addTarget(payload);
    if (!ok) {
      setFormError("数据格式不正确，未保存");
      return;
    }
    setFormError("");
    setMode({ kind: "none" });
  }

  function downloadTemplate() {
    const rows = [
      ["姓名", "手机号", "国家/地区"],
      ["Sophia Miller", "+1 305 555 0182", "美国"],
      ["Carlos Mendez", "+34 600 555 019", "西班牙"],
      ["Emma Wilson", "+44 7700 555 014", "英国"],
      ["李静", "+86 138 0000 0777", "中国"],
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "目标导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const body = lines.filter((l) => l.trim() && !/^\s*姓名/.test(l));
    setFileName(file.name);
    setBulk(body.join("\n"));
  }

  function saveBulk() {
    const rows = bulk
      .split("\n")
      .map((line) => line.split(/[,\t，]/).map((c) => c.trim()))
      .filter((cols) => cols[0] && cols[1])
      .map((cols) => ({ name: cols[0]!, phone: cols[1]!, region: cols[2] || "未填写" }));
    if (rows.length === 0) {
      setImportInfo("没有可导入的数据");
      return;
    }
    const res = importTargets(rows);
    const parts = [`成功导入 ${res.added} 条`];
    if (res.invalid) parts.push(`过滤格式无效 ${res.invalid} 条`);
    if (res.duplicated) parts.push(`跳过重复号码 ${res.duplicated} 条`);
    if (res.added === 0) {
      setImportInfo(parts.join("，"));
      return;
    }
    setImportInfo("");
    setBulk("");
    setFileName("");
    setMode({ kind: "none" });
  }

  return (
    <AppShell
      title="目标管理"
      subtitle="营销目标名单与批量导入"
      drawer={
        mode.kind === "single" ? (
          <Drawer
            title={mode.target ? "编辑目标" : "新增目标"}
            onClose={() => setMode({ kind: "none" })}
            footer={
              <>
                <button
                  className="btn-ghost px-4 py-2.5 text-sm"
                  onClick={() => setMode({ kind: "none" })}
                >
                  取消
                </button>
                <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={saveSingle}>
                  保存
                </button>
              </>
            }
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">姓名</label>
              <input className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">手机号</label>
              <input
                className="field mt-1.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 305 555 0182"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">国家 / 地区</label>
              <input
                className="field mt-1.5"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="美国"
              />
            </div>
            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </p>
            )}
          </Drawer>
        ) : mode.kind === "import" ? (
          <Drawer
            title="批量导入"
            hint="每行一条"
            onClose={() => setMode({ kind: "none" })}
            footer={
              <>
                <button
                  className="btn-ghost px-4 py-2.5 text-sm"
                  onClick={() => setMode({ kind: "none" })}
                >
                  取消
                </button>
                <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={saveBulk}>
                  导入名单
                </button>
              </>
            }
          >
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-xs font-medium">第 1 步 · 下载模板</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                模板含三列：姓名、手机号（含国际区号）、国家/地区。
              </p>
              <button className="btn-ghost mt-2 px-3 py-1.5 text-xs" onClick={downloadTemplate}>
                下载导入模板 (.csv)
              </button>
            </div>

            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-xs font-medium">第 2 步 · 上传文件</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                支持 .csv / .txt，首行表头会自动忽略。
              </p>
              <label className="btn-ghost mt-2 inline-flex cursor-pointer px-3 py-1.5 text-xs">
                选择文件
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </label>
              {fileName && (
                <span className="ml-2 text-[11px] text-muted-foreground">已选择 {fileName}</span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                第 3 步 · 核对名单（姓名, 手机号, 国家/地区）
              </label>
              <textarea
                className="field mt-1.5 min-h-64 resize-y font-mono text-xs"
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={"Sophia Miller, +1 305 555 0182, 美国\nCarlos Mendez, +34 600 555 019, 西班牙"}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                支持逗号、制表符分隔，可直接从表格复制粘贴。已识别 {bulkStats.valid} 条有效数据
                {bulkStats.invalid > 0 ? `，${bulkStats.invalid} 条手机号格式无效将被自动过滤` : ""}。
              </p>
            </div>
            {importInfo && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {importInfo}
              </p>
            )}
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="目标总数" value={targets.length.toLocaleString()} />
        <StatCard label="覆盖地区" value={String(regions)} tone="primary" />
        <StatCard label="启用中" value={String(enabledCount)} />
        <StatCard label="已禁用" value={String(disabledCount)} />

      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">目标名单</h2>
          <span className="text-xs text-muted-foreground">
            共 {targets.length} 条 · 当前筛选 {filtered.length} 条
          </span>
          <div className="ml-auto flex items-center gap-2">
            <input
              className="field w-52 py-1.5 text-xs"
              placeholder="搜索姓名 / 手机号 / 地区"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                pageProps.onPage(1);
              }}
            />
            <select
              className="field w-28 py-1.5 text-xs"
              value={enabledFilter}
              onChange={(e) => {
                setEnabledFilter(e.target.value as "all" | "enabled" | "disabled");
                pageProps.onPage(1);
              }}
            >
              <option value="all">全部状态</option>
              <option value="enabled">启用</option>
              <option value="disabled">禁用</option>
            </select>

            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => setMode({ kind: "import" })}
            >
              批量导入
            </button>
            <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => openSingle()}>
              <span className="-ml-0.5 text-base leading-none">+</span> 新增目标
            </button>
            <button
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={selected.length === 0}
              onClick={() => {
                setTargetsEnabled(selected, true);
                setSelectedIds([]);
              }}
            >
              批量启用
            </button>
            <button
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={selected.length === 0}
              onClick={() => {
                setTargetsEnabled(selected, false);
                setSelectedIds([]);
              }}
            >
              批量禁用
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-5 py-3" />
              <th className="px-3 py-3 font-medium">姓名</th>
              <th className="px-3 py-3 font-medium">手机号</th>
              <th className="px-3 py-3 font-medium">国家 / 地区</th>
              <th className="px-3 py-3 font-medium">启用状态</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-background/70">
                <td className="px-5 py-3">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[hsl(var(--primary))]"
                    aria-label={`选择 ${t.name}`}
                    checked={selected.includes(t.id)}
                    onChange={() => toggleOne(t.id)}
                  />
                </td>
                <td className="px-3 py-3 font-medium">{t.name}</td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{t.phone}</td>
                <td className="px-3 py-3 text-muted-foreground">{t.region}</td>
                <td className="px-3 py-3">
                  {t.enabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      <span className="size-1.5 rounded-full bg-primary" />
                      启用
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                      禁用
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      className="btn-ghost px-3 py-1.5 text-xs"
                      onClick={() => setTargetsEnabled([t.id], !t.enabled)}
                    >
                      {t.enabled ? "禁用" : "启用"}
                    </button>
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => openSingle(t)}>
                      编辑
                    </button>
                    <button
                      className="btn-ghost px-3 py-1.5 text-xs hover:text-destructive"
                      onClick={() => removeTarget(t.id)}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  暂无匹配的目标，可调整筛选或新增/批量导入名单
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
