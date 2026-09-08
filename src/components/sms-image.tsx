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
  const pad = size === "sm" ? "p-2" : size === "md" ? "p-3.5" : "p-4";
  const title = size === "sm" ? "text-[11px]" : size === "md" ? "text-[15px]" : "text-lg";
  return (
    <div className={`overflow-hidden rounded-xl bg-ink text-ink-foreground ${pad}`}>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-ink-foreground/45">
        <span>AirHui · 图片短信</span>
        <span>MMS</span>
      </div>
      <div className={`mt-2 font-display font-semibold leading-snug ${title}`}>{content}</div>
      <div className="mt-3 flex items-center justify-between border-t border-ink-foreground/15 pt-2">
        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
          立即查看 →
        </span>
        <span className="text-[9px] text-ink-foreground/45">由模板内容自动生成</span>
      </div>
    </div>
  );
}

/** 明细列表中的小缩略图 */
export function PosterThumb({ content }: { content: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 flex-col justify-between overflow-hidden rounded-md bg-ink p-1 text-left">
      <span className="block truncate text-[5px] leading-tight text-ink-foreground/70">
        {content}
      </span>
      <span className="block h-1 w-4 rounded-full bg-primary" />
    </span>
  );
}
