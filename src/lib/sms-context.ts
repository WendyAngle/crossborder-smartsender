import { createContext, type Context } from "react";

/**
 * 独立的上下文模块，并缓存在 globalThis 上：
 * 任何模块热更新或以不同时间戳重新加载时，Provider 与消费组件
 * 始终拿到同一个 Context 对象，避免"must be used inside SmsStoreProvider"白屏。
 */
const KEY = "__smsStoreContext__";
const g = globalThis as unknown as Record<string, Context<unknown> | undefined>;

export const StoreContext: Context<unknown> = g[KEY] ?? (g[KEY] = createContext<unknown>(null));
