import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1),
  region: z.string().min(1),
});

/** 将回复内容翻译成目标地区对应的语言 */
export const translateForRegion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("翻译服务未配置，请稍后再试");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "你是跨境电商短信翻译助手。把用户提供的文本翻译成目标国家/地区的官方语言，" +
              "语气自然、简洁、适合短信。只输出译文本身，不要解释、不要引号、不要拼音或注音。", 
          },
          {
            role: "user",
            content: `目标国家/地区：${data.region}\n需要翻译的内容：\n${data.text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("翻译请求过于频繁，请稍后重试");
      if (res.status === 402) throw new Error("AI 额度不足，请联系管理员补充额度后重试");
      if (res.status === 403) throw new Error("AI 功能已被限制，请联系管理员");
      throw new Error(`翻译失败（${res.status}）：${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const translated = json.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error("翻译结果为空，请重试");
    return { translated };
  });
