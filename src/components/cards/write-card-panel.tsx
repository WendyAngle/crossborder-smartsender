import { useRef, useState, useMemo } from "react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { Upload, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePhoneCards } from "@/lib/phone-card-store";
import { activationError, activationFingerprint, autoDistribute, availableCapacity, writeReasons, type Plan } from "@/lib/phone-cards";
import { CardPanel, CardField, ErrorNote } from "./card-common";
type Entry={id:string;source:string;code:string;confirmation:string;cardId:string};
export function WriteCardPanel({onClose}:{onClose:()=>void}) {
  const {state,setState}=usePhoneCards();
  const [step,setStep]=useState(1);
  const [entries,setEntries]=useState<Entry[]>([]); const [bulk,setBulk]=useState(""); const [error,setError]=useState("");
  const [strategy,setStrategy]=useState("auto"); const [reading,setReading]=useState(false); const fileRef=useRef<HTMLInputElement>(null);
  const [finished,setFinished]=useState(false);
  const submitting=useRef(false);
  const eligible=state.cards.filter(c=>c.kind==="euicc"&&!writeReasons(c,state.plans).length).sort((a,b)=>(availableCapacity(b,state.plans)??0)-(availableCapacity(a,state.plans)??0));
  const distribution=useMemo(()=>{try{return autoDistribute(eligible.map(c=>({id:c.id,free:availableCapacity(c,state.plans)})),entries.length);}catch{return [];}},[eligible,entries.length,state.plans]);
  const assigned=entries.map((e,i)=>strategy==="auto" ? distribution[i]??"":e.cardId);
  const issues=entries.map((e,i)=>activationError(e.code) ?? (entries.filter(x=>activationFingerprint(x.code)===activationFingerprint(e.code)).length>1 ? "同批激活码重复":null) ?? (!assigned[i] ? "未分配或总容量不足":null));
  async function files(list:FileList|null){
    if(!list)return; if(list.length>50){setError("单批最多 50 张图片");return;}
    setReading(true);setError("");const added:Entry[]=[];
    for(const file of Array.from(list)) {
      if(!["image/png","image/jpeg"].includes(file.type)||file.size>10*1024*1024){added.push({id:crypto.randomUUID(),source:file.name,code:"",confirmation:"",cardId:""});continue;}
      try {const bitmap=await createImageBitmap(file); const canvas=document.createElement("canvas"); const ratio=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext("2d");if(!ctx)throw Error();ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const qr=jsQR(pixels.data,pixels.width,pixels.height);added.push({id:crypto.randomUUID(),source:file.name,code:qr?.data??"",confirmation:"",cardId:""});}catch{added.push({id:crypto.randomUUID(),source:file.name,code:"",confirmation:"",cardId:""});}
    }setEntries(prev=>[...prev,...added]);setReading(false);
  }
  async function submit(){
    if(submitting.current)return;
    setError("");if(!entries.length||issues.some(Boolean)){setError("请修正或移除所有异常条目");return;}
    const counts=new Map<string,number>();assigned.forEach(id=>counts.set(id,(counts.get(id)??0)+1));
    for(const [id,count] of counts){const card=state.cards.find(c=>c.id===id);if(!card||writeReasons(card,state.plans).length||count>availableCapacity(card,state.plans)){setError("卡片状态或容量已变化，请重新分配");return;}}
    submitting.current=true;
    const hashes=await Promise.all(entries.map(async e=>{const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(activationFingerprint(e.code)));return Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("");}));
    if(hashes.some(h=>state.activationHashes.includes(h))){submitting.current=false;setError("激活码已用于本次会话的模拟安装，不可再次下发");return;}
    const now=new Date().toISOString();
    const plans:Plan[]=entries.map((e,i)=>({id:crypto.randomUUID(),cardId:assigned[i]??"",iccid:"",phone:null,region:"未知",country:"—",carrier:"未回传",supplier:"未回传",channel:"未回传",phoneSource:"未知",ims:"未知",connection:"未知",send:null,receive:null,smsc:"未知",image:false,status:"disabled",active:false,note:"模拟写入套餐",tagIds:[],limit:null,used:0,reserved:0,diagnostic:"—",diagnosticAt:null,retryAt:null,updatedAt:now}));
    setState(s=>({...s,activationHashes:[...s.activationHashes,...hashes],plans:[...s.plans,...plans],jobs:[{id:crypto.randomUUID(),at:now,type:"批量写卡",items:entries.map((e,i)=>({cardId:assigned[i]??"",label:`条目 ${i+1} · ${e.source}`,state:"成功"}))},...s.jobs]}));
    setEntries([]);setBulk("");toast.success("写卡任务已提交，请稍后点击写卡任务进度按钮查看进展情况");onClose();
  }
  return <CardPanel title="批量写卡" onClose={onClose} footer={finished?<Button onClick={onClose}>完成</Button>:<><Button variant="outline" onClick={onClose}>取消</Button>{step>1&&<Button variant="outline" onClick={()=>{setStep(step-1);setError("");}}><ArrowLeft/>上一步</Button>}{step<2?<Button disabled={reading} onClick={()=>{if(!entries.length){setError("请添加激活码");return;}setError("");setStep(step+1);}}>下一步<ArrowRight/></Button>:<Button onClick={submit}>提交写卡</Button>}</>}>

    {finished?<div className="py-12 text-center"><h3 className="text-xl font-semibold text-primary">模拟写卡已完成</h3><p className="mt-3 text-sm text-muted-foreground">结果已保存至本次会话的写入任务，新增套餐默认停用、未生效。</p></div>:<><div className="flex justify-between border-b border-border pb-4 text-sm">{["添加激活码","分配与预览"].map((v,i)=><span key={v} className={step===i+1?"font-semibold text-primary":"text-muted-foreground"}>{i+1}. {v}</span>)}</div>
    {step===1&&<><Button variant="outline" onClick={()=>fileRef.current?.click()} disabled={reading}><Upload/>{reading?"正在本地识别":"上传二维码图片"}</Button><input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg" multiple onChange={e=>void files(e.target.files)}/><CardField label="激活码（每行一条）"><textarea aria-label="激活码输入" className="field min-h-32 font-mono text-xs" value={bulk} onChange={e=>setBulk(e.target.value)} placeholder="LPA:1$SM-DP+地址$Matching ID"/></CardField><Button variant="outline" onClick={()=>{setEntries(p=>[...p,...bulk.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).map((code,i)=>({id:crypto.randomUUID(),source:`输入行 ${i+1}`,code,confirmation:"",cardId:""}))]);setBulk("");}}>添加至清单</Button><p className="text-xs text-muted-foreground">PNG/JPEG · 单图 10 MB · 单批 50 张 · 仅本地识别</p>{entries.map((e,i)=><div key={e.id} className="space-y-2 border-b border-border py-3"><div className="flex justify-between text-xs"><span>{i+1}. {e.source}</span><Button variant="ghost" size="sm" onClick={()=>setEntries(p=>p.filter(x=>x.id!==e.id))}>移除</Button></div><input aria-label={`激活码 ${i+1}`} className="field font-mono text-xs" value={e.code} onChange={ev=>setEntries(p=>p.map(x=>x.id===e.id?{...x,code:ev.target.value}:x))}/><input type="password" aria-label={`确认码 ${i+1}`} placeholder="可选确认码" className="field" value={e.confirmation} onChange={ev=>setEntries(p=>p.map(x=>x.id===e.id?{...x,confirmation:ev.target.value}:x))}/>{activationError(e.code)&&<p className="text-xs text-destructive">{e.code?activationError(e.code):"识别失败，请输入激活码或移除此条"}</p>}</div>)}</>}
    {step===2&&<><CardField label="分配策略"><select className="field" value={strategy} onChange={e=>setStrategy(e.target.value)}><option value="auto">系统自动分配</option><option value="manual">逐条手动选择</option></select></CardField>{eligible.map(c=><p className="text-xs" key={c.id}>{c.note} · 本次 {assigned.filter(id=>id===c.id).length} 条 / 可用 {availableCapacity(c,state.plans)}</p>)}{entries.map((e,i)=><div className="flex items-center justify-between gap-3 border-b border-border py-3 text-xs" key={e.id}><span>{i+1} · {e.source}<br/><span className="text-muted-foreground">激活码已隐藏</span></span>{strategy==="manual"?<select className="field max-w-40" value={e.cardId} onChange={ev=>setEntries(p=>p.map(x=>x.id===e.id?{...x,cardId:ev.target.value}:x))}><option value="">选择白卡</option>{eligible.map(c=><option key={c.id} value={c.id}>{c.note}</option>)}</select>:<span>{state.cards.find(c=>c.id===assigned[i])?.note??"未分配"}</span>}<span className={issues[i]?"text-destructive":"text-primary"}>{issues[i]??"校验通过"}</span></div>)}</>}
    <ErrorNote text={error}/></>}
  </CardPanel>;
}