import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabel, type CardStatus } from "@/lib/phone-cards";
export function CardPanel({title,children,footer,onClose}:{title:string;children:ReactNode;footer?:ReactNode;onClose:()=>void}) {
  return <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose}><aside role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()} className="absolute inset-y-0 right-0 flex w-[680px] max-w-full flex-col border-l border-border bg-card shadow-2xl"><header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6"><h2 className="text-base font-semibold">{title}</h2><Button variant="ghost" size="icon" title="关闭" aria-label="关闭" onClick={onClose}><X/></Button></header><div className="flex-1 space-y-5 overflow-y-auto p-6">{children}</div>{footer && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border p-4">{footer}</footer>}</aside></div>;
}
export function StatusPill({status}:{status:CardStatus}) {return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${status==="enabled"?"bg-accent text-accent-foreground":status==="blocked"?"bg-destructive-soft text-destructive":"bg-warning-soft text-warning-foreground"}`}>{statusLabel[status]}</span>;}
export function CardField({label,children}:{label:string;children:ReactNode}) {return <label className="block space-y-2 text-xs font-medium text-muted-foreground"><span>{label}</span>{children}</label>;}
export function ErrorNote({text}:{text:string}) {return text ? <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive">{text}</p>:null;}