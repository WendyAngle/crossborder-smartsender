import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyValue({ value, label, display, fallback = "未回传" }: { value?: string | null | undefined; label: string; display?: string | undefined; fallback?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
    }
  }
  return <div className="flex items-center gap-1 whitespace-nowrap"><span title={value ?? undefined} className="font-medium">{value ? display ?? value : fallback}</span>{value && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" title={copied ? "已复制" : `复制${label}`} aria-label={`复制${label} ${value}`} onClick={copy}>{copied ? <Check className="text-primary" /> : <Copy className="text-muted-foreground" />}</Button>}{failed && <span role="alert" className="text-xs text-destructive">复制失败，请重试</span>}</div>;
}