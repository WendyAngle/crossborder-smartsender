import { MSG_TYPE_LABEL, type MsgType } from "@/lib/sms-store";

/** 发信内容类型标签 */
export function MsgTypePill({ type }: { type: MsgType }) {
  const isImage = type === "image";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        isImage ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {isImage ? "◧" : "¶"} {MSG_TYPE_LABEL[type]}
    </span>
  );
}

/**
 * 依据模板内容推导同色系浅色背景：色相固定在冷色系（205°–225°）内微调，
 * 明度 94%–96% 微调，保证不同模板生成的图片背景有细微差异但整体风格统一。
 */
function posterBackground(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
  }
  const hue = 205 + (hash % 21); // 205–225，同色系内变化
  const lightness = 94 + ((hash >> 8) % 3); // 94–96
  return `hsl(${hue} 55% ${lightness}%)`;
}

/**
 * 图片短信的生成图：系统把所选模板内容排版成一张营销图片后作为图片短信下发。
 * 这里按同一套排版规则渲染，保证「预览」与「明细」看到的是同一张图。
 */
export function SmsPoster({
  content,
  size = "md",
}: {
  content: string;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "sm" ? "p-2.5" : size === "md" ? "p-3.5" : "p-4";
  const title = size === "sm" ? "text-[11px]" : size === "md" ? "text-[15px]" : "text-lg";
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border ${pad}`}
      style={{ backgroundColor: posterBackground(content) }}
    >
      <div className={`font-display font-semibold leading-snug text-foreground ${title}`}>
        {content}
      </div>
      <div className="mt-3 border-t border-border pt-2">
        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
          立即查看 →
        </span>
      </div>
    </div>
  );
}

