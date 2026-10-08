import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SmsPoster } from "@/components/sms-image";
import { useSmsStore, templateVariables, renderTemplate, countCredits, isValidPhone, statusLabel as targetStatusLabel, type MsgType } from "@/lib/sms-store";
import { usePhoneCards } from "@/lib/phone-card-store";
import { sendReasons, statusLabel } from "@/lib/phone-cards";
import { CardPanel, CardField, ErrorNote } from "./card-common";

function Seg({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:[string,string][]}) {
  return <div className="flex gap-1 rounded-md bg-muted p-1">{options.map(([v,l])=><button key={v} type="button" className={`flex-1 rounded px-3 py-2 text-sm ${value===v?"bg-card font-semibold shadow-sm":"text-muted-foreground"}`} onClick={()=>onChange(v)}>{l}</button>)}</div>;
}

export function CardSendPanel({cardId,planId,onClose}:{cardId:string;planId?:string | undefined;onClose:()=>void}) {
  const {state,setState}=usePhoneCards();const sms=useSmsStore();
  const [targetMode,setTargetMode]=useState<"exist"|"new">("exist");const [targetId,setTargetId]=useState("");const [phone,setPhone]=useState("");const [name,setName]=useState("");
  const [contentMode,setContentMode]=useState<"tpl"|"manual">("tpl");const [type,setType]=useState<MsgType>("text");const [tplId,setTplId]=useState("");const [text,setText]=useState("");const [vars,setVars]=useState<Record<string,string>>({});
  const [follow,setFollow]=useState(true);const [error,setError]=useState("");const [done,setDone]=useState(false);
  const card=state.cards.find(c=>c.id===cardId);const plan=state.plans.find(p=>planId?p.id===planId:p.cardId===cardId&&p.active);
  const target=targetMode==="exist"?sms.targets.find(t=>t.id===targetId&&t.enabled):undefined;
  const tpl=contentMode==="tpl"?sms.templates.find(t=>t.id===tplId&&t.enabled):undefined;
  const variables=tpl?templateVariables(tpl.content).filter(v=>v.token!=="{联系人}"||!target):[];
  const content=useMemo(()=>tpl?renderTemplate(tpl.content,target?.name??name??vars["{联系人}"]??"",vars):text,[tpl,target,name,vars,text]);
  const region=target?.region??plan?.region??"";
  if(!card)return null;
  function submit(){if(!card||!plan)return;const reasons=sendReasons(card,plan);if(reasons.length){setError(reasons.join("；"));return;}
    if(targetMode==="exist"&&!target){setError("请选择启用目标");return;}
    if(targetMode==="new"&&!isValidPhone(phone)){setError("请填写有效国际收件号码");return;}
    if(!content.trim()||variables.some(v=>!vars[v.token]?.trim())){setError("请填写内容及全部模板变量");return;}
    if(type==="image"&&(!tpl||!plan.image)){setError("图片短信需选择启用模板且通道支持图片");return;}
    if(follow&&plan.receive!==true){setError("当前套餐不支持回复接收，请取消跟进或更换卡");return;}
    if(region!==plan.region){setError("演示通道不支持该收件地区，请选择匹配的卡片");return;}
    const credits=countCredits(content,follow);if(credits>12480-sms.records.reduce((n,r)=>n+(r.status==="failed"?0:r.credits),0)){setError("积分余额不足");return;}
    sms.sendCardSms({target,phone:target?.phone??phone,region,content,msgType:type,followUp:follow});setState(s=>({...s,plans:s.plans.map(p=>p.id===plan.id?{...p,used:p.used+1}:p),jobs:[{id:crypto.randomUUID(),at:new Date().toISOString(),type:"模拟发送短信",items:[{cardId:card.id,label:target?.phone??phone,state:"成功"}]},...s.jobs]}));setDone(true);
  }
  return <CardPanel title="发送短信 · 模拟" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>{done?"关闭":"取消"}</Button>{!done&&<Button onClick={submit}>提交发送 · {countCredits(content,follow)} 积分</Button>}</>}>
    <p className="rounded-md bg-warning-soft p-3 text-xs text-warning-foreground">仅模拟发送并生成短信明细，不向真实号码发送。</p>
    {done?<p className="py-12 text-center font-semibold text-primary">模拟短信已提交，可在短信明细查看。</p>:<>
      <div className="grid grid-cols-2 gap-y-2 border-b border-border pb-4 text-sm">
        <p><span className="text-muted-foreground">电话卡：</span>{plan?.phone??card.note}</p>
        <p><span className="text-muted-foreground">国家/地区：</span>{plan?.region??"未知"}</p>
        <p><span className="text-muted-foreground">管理状态：</span>{statusLabel[plan?.status??card.status]}</p>
        <p><span className="text-muted-foreground">卡类型：</span>{card.kind==="euicc"?"eUICC 白卡":"普通 UICC 卡"}</p>
      </div>
      <CardField label="发送目标" required>
        <Seg value={targetMode} onChange={v=>{setTargetMode(v as "exist"|"new");setError("");}} options={[["exist","选择已有目标"],["new","输入新手机号"]]}/>
        {targetMode==="exist"?<select aria-label="搜索并选择启用目标" className="field mt-2" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">搜索并选择启用目标</option>{sms.targets.filter(t=>t.enabled).map(t=><option key={t.id} value={t.id}>{t.name} · {t.phone} · {t.region}</option>)}</select>:<>
          <input aria-label="手机号" className="field mt-2" placeholder="手机号，例如 +4917642558948" value={phone} onChange={e=>setPhone(e.target.value)}/>
          <input aria-label="姓名" className="field mt-2" placeholder="姓名，可选；留空则使用规范化手机号" value={name} onChange={e=>setName(e.target.value)}/>
          <p className="mt-2 text-xs text-muted-foreground">新目标将使用当前电话卡地区：{plan?.region??"未知"}</p>
        </>}
      </CardField>
      <CardField label="短信内容" required>
        <Seg value={contentMode} onChange={v=>{setContentMode(v as "tpl"|"manual");setError("");}} options={[["tpl","使用模板"],["manual","手工输入"]]}/>
        {contentMode==="tpl"?<>
          <select aria-label="选择已启用的短信模板" className="field mt-2" value={tplId} onChange={e=>{setTplId(e.target.value);setVars({});}}><option value="">选择已启用的短信模板</option>{sms.templates.filter(t=>t.enabled).map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select>
          {variables.map(v=><input key={v.token} aria-label={v.label} className="field mt-2" placeholder={v.label} value={vars[v.token]??""} onChange={e=>setVars(p=>({...p,[v.token]:e.target.value}))}/>)}
        </>:<textarea aria-label="短信正文" className="field mt-2 min-h-32" placeholder="请输入短信正文" maxLength={4096} value={text} onChange={e=>setText(e.target.value)}/>}
        {contentMode==="manual"&&<p className="mt-1 text-right text-xs text-muted-foreground">{text.length} / 4096</p>}
      </CardField>
      <CardField label="发信内容类型"><select className="field" value={type} onChange={e=>setType(e.target.value==="image"?"image":"text")}><option value="text">文本</option><option value="image">图片</option></select></CardField>
      <div className="border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">内容预览</h3>
        {type==="image"&&tpl?<SmsPoster content={content}/>:content.trim()?<p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{content}</p>:<p className="text-sm text-muted-foreground">填写目标与内容后预览短信</p>}
      </div>
      <label className="flex gap-2 text-sm"><Checkbox checked={follow} onCheckedChange={v=>setFollow(v===true)}/>是否跟进回复</label>
      <p className="text-xs text-muted-foreground">预计积分 {countCredits(content,follow)} · 跟进为基础积分的 1.5 倍</p>
      <ErrorNote text={error}/>
    </>}
  </CardPanel>;
}
