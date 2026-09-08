import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, Drawer, StatCard } from "@/components/app-shell";
import { Pagination, usePagination } from "@/components/pagination";
import { useSmsStore, type Target } from "@/lib/sms-store";

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
  const { targets, addTarget, updateTarget, removeTarget, importTargets } = useSmsStore();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [query, setQuery] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [bulk, setBulk] = useState("");
  const [fileName, setFileName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) =>
      [t.name, t.phone, t.region].some((v) => v.toLowerCase().includes(q)),
    );
  }, [targets, query]);

  const { pageItems, props: pageProps } = usePagination(filtered);

  const regions = new Set(targets.map((t) => t.region)).size;

  function openSingle(target?: Target) {
    setName(target?.name ?? "");
    setPhone(target?.phone ?? "");
    setRegion(target?.region ?? "");
    setMode({ kind: "single", target });
  }

  function saveSingle() {
    if (!name.trim() || !phone.trim()) return;
    const payload = { name: name.trim(), phone: phone.trim(), region: region.trim() || "未填写" };
    if (mode.kind === "single" && mode.target) updateTarget(mode.target.id, payload);
    else addTarget(payload);
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
    if (rows.length === 0) return;
    importTargets(rows);
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
                支持逗号、制表符分隔，可直接从表格复制粘贴。已识别{" "}
                {bulk.split("\n").filter((l) => l.split(/[,\t，]/).filter((c) => c.trim()).length >= 2).length}{" "}
                条有效数据。
              </p>
            </div>
          </Drawer>
        ) : null
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="目标总数" value={targets.length.toLocaleString()} />
        <StatCard label="覆盖地区" value={String(regions)} tone="primary" />
        <StatCard label="当前筛选" value={String(filtered.length)} />
        <StatCard label="可发送" value={targets.length.toLocaleString()} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-semibold">目标名单</h2>
          <span className="text-xs text-muted-foreground">共 {targets.length} 条</span>
          <div className="ml-auto flex items-center gap-2">
            <input
              className="field w-52 py-1.5 text-xs"
              placeholder="搜索姓名 / 手机号 / 地区"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => setMode({ kind: "import" })}
            >
              批量导入
            </button>
            <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => openSingle()}>
              <span className="-ml-0.5 text-base leading-none">+</span> 新增目标
            </button>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">姓名</th>
              <th className="px-3 py-3 font-medium">手机号</th>
              <th className="px-3 py-3 font-medium">国家 / 地区</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-background/70">
                <td className="px-5 py-3 font-medium">{t.name}</td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">{t.phone}</td>
                <td className="px-3 py-3 text-muted-foreground">{t.region}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-2">
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
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  暂无目标，先新增或批量导入名单
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
