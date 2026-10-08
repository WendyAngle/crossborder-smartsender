import { describe, expect, it } from "vitest";
import { initialCardStatus, syncCard, setLocalStatus, makeDemoCards, autoDistribute, writeReasons, remaining, activationError } from "./phone-cards";
describe("电话卡业务规则", () => {
  it("首次同步在线默认启用", () => { expect(initialCardStatus("online")).toBe("enabled"); });
  it("首次同步离线默认停用", () => { expect(initialCardStatus("offline")).toBe("disabled"); });
  it("首次同步未知及缺失默认停用", () => { expect(initialCardStatus("unknown")).toBe("disabled"); expect(initialCardStatus()).toBe("disabled"); });
  it("后续同步不会覆盖本地状态", () => { const c=makeDemoCards().cards[0]; if(!c) throw Error(); expect(syncCard({...c,status:"disabled"}, {...c, online:"online"}).status).toBe("disabled"); expect(syncCard({...c,status:"blocked"}, {...c, online:"offline"}).status).toBe("blocked"); });
  it("首次同步依据在线而非传入管理状态", () => { const c=makeDemoCards().cards[0]; if(!c) throw Error(); expect(syncCard(undefined,{...c,status:"disabled"}).status).toBe("enabled"); });
  it("启停不改变在线或运行状态", () => { const c=makeDemoCards().cards[0]; if(!c) throw Error(); const next=setLocalStatus(c,"disabled"); expect(next.online).toBe(c.online); expect(next.operation).toBe(c.operation); expect(next.eid).toBe(c.eid); });
  it("1/4/4容量分配6条为1/3/2", () => { const ids=autoDistribute([{id:"a",free:1},{id:"b",free:4},{id:"c",free:4}],6); expect(["a","b","c"].map(id=>ids.filter(v=>v===id).length)).toEqual([1,3,2]); });
  it("容量不足禁止整批分配", () => { expect(()=>autoDistribute([{id:"a",free:9}],10)).toThrow(); });
  it("停用卡禁止写入", () => { const s=makeDemoCards(); const c=s.cards[0]; if(!c) throw Error(); expect(writeReasons({...c,status:"disabled"},s.plans)).toContain("白卡未启用或已封禁"); });
  it("日额度预占不重复扣减", () => { const p=makeDemoCards().plans[0]; if(!p) throw Error(); expect(remaining({...p,limit:29,used:5,reserved:2})).toBe(22); expect(remaining({...p,limit:29,used:7,reserved:0})).toBe(22); });
  it("只接受激活码而非任意二维码", () => { expect(activationError("https://example.com")).toBeTruthy(); expect(activationError("LPA:1$demo.example$CaseSensitiveID")).toBeNull(); });
});