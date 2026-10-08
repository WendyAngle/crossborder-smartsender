import { createContext } from "react";

/**
 * 独立的上下文模块：sms-store.tsx 热更新时上下文对象身份保持不变，
 * 避免 Provider 与消费组件在热更新瞬间拿到两份不同的 Context 而白屏。
 * 这里不引用 Store 类型（避免与 sms-store 形成循环引用），
 * 消费处在 useSmsStore 中断言为 Store。
 */
export const StoreContext = createContext<unknown>(null);
