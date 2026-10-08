import { createContext } from "react";
import type { Store } from "./sms-store";

/**
 * 独立的上下文模块：sms-store.tsx 热更新时上下文对象身份保持不变，
 * 避免 Provider 与消费组件在热更新瞬间拿到两份不同的 Context 而白屏。
 */
export const StoreContext = createContext<Store | null>(null);
