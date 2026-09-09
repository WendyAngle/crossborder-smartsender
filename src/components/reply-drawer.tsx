import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Drawer } from "@/components/app-shell";
import { SmsPoster } from "@/components/sms-image";
import { formatTime, useSmsStore, type SmsRecord } from "@/lib/sms-store";
import { translateForRegion } from "@/lib/translate.functions";

const REGION_LANGUAGE: Record<string, string> = {
  美国: "英语",
  英国: "英语",
  德国: "德语",
  日本: "日语",
  韩国: "韩语",
  西班牙: "西班牙语",
  阿联酋: "阿拉伯语",
  中国: "中文",
  法国: "法语",
  意大利: "意大利语",
  印度: "印地语",
  澳大利亚: "英语",
  马来西亚: "马来语",
  越南: "越南语",
  新加坡: "英语",
  俄罗斯: "俄语",
  巴西: "葡萄牙语",
};

export function regionLanguage(region: string) {
  return REGION_LANGUAGE[region] ?? `${region}语言`;
}

/** 会话与回复抽屉：短信明细与任务目标名单共用 */
export function ReplyDrawer({ record, onClose }: { record: SmsRecord; onClose: () => void }) {
  const { targetById, sendReply, threadRecords } = useSmsStore();
  const [replyText, setReplyText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [originalText, setOriginalText] = useState("");
  const translate = useServerFn(translateForRegion);

  const target = targetById(record.targetId);
  const thread = threadRecords(record.threadId);

  async function doTranslate(text: string, region: string) {
    setTranslating(true);
    setTranslateError("");
    try {
      const res = await translate({ data: { text: text.trim(), region } });
      setOriginalText(text.trim());
      setReplyText(res.translated);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "翻译失败，请稍后重试");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <Drawer
      title="会话与回复"
      hint={`${target?.name ?? ""} · ${target?.region ?? ""}`}
      width="w-[560px]"
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost px-4 py-2.5 text-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary flex-1 px-4 py-2.5 text-sm"
            onClick={() => {
              if (!replyText.trim()) return;
              sendReply(record.id, replyText.trim());
              setReplyText("");
              onClose();
            }}
          >
            发送回复（新增一条短信）
          </button>
        </>
      }
    >
      <div>
        <div className="text-xs font-medium text-muted-foreground">
          会话记录 · 共 {thread.length} 条外发
        </div>
        <div className="mt-2 space-y-2.5">
          {thread.map((r) => (
            <div key={r.id} className="space-y-2.5">
              <div className="rounded-xl bg-background p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  我方 · 第 {r.seq} 条 · {r.kind === "campaign" ? "任务群发" : "人工回复"} ·{" "}
                  {(r.msgType ?? "text") === "image" ? "图片" : "文本"}
                  <span className="ml-auto tabular-nums">{formatTime(r.createdAt)}</span>
                </div>
                {(r.msgType ?? "text") === "image" ? (
                  <div className="mt-1.5 max-w-[80%]">
                    <SmsPoster content={r.content} size="sm" />
                  </div>
                ) : (
                  <div className="mt-1.5 text-[13px] leading-relaxed">{r.content}</div>
                )}
                {r.contentZh && (
                  <div className="mt-1.5 border-t border-border pt-1.5 text-xs text-muted-foreground">
                    译文：{r.contentZh}
                  </div>
                )}
              </div>
              {r.reply && (
                <div className="ml-6 rounded-xl bg-accent p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-accent-foreground/70">
                    对方回复
                    <span className="ml-auto tabular-nums">{formatTime(r.replyAt)}</span>
                  </div>
                  <div className="mt-1.5 text-[13px] leading-relaxed text-accent-foreground">
                    {r.reply}
                  </div>
                  {r.replyZh && (
                    <div className="mt-1.5 border-t border-accent-foreground/15 pt-1.5 text-xs text-accent-foreground/70">
                      译文：{r.replyZh}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">回复内容</label>
          <button
            className="btn-ghost ml-auto px-3 py-1.5 text-xs"
            disabled={translating || !replyText.trim()}
            onClick={() => void doTranslate(replyText, target?.region ?? "")}
          >
            {translating ? "翻译中…" : `翻译为${regionLanguage(target?.region ?? "")}`}
          </button>
        </div>
        <textarea
          className="field mt-1.5 min-h-28 resize-y"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="输入回复内容…"
        />
        {translateError && (
          <p className="mt-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {translateError}
          </p>
        )}
        {originalText && (
          <div className="mt-1.5 rounded-lg border border-border bg-background/60 p-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>翻译前内容</span>
              <button
                className="ml-auto underline hover:text-foreground"
                onClick={() => {
                  setReplyText(originalText);
                  setOriginalText("");
                }}
              >
                撤销翻译
              </button>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{originalText}</div>
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          回复将作为同一会话的第 {thread.length + 1} 条短信独立记账，原记录保持不变。
        </p>
      </div>
    </Drawer>
  );
}
