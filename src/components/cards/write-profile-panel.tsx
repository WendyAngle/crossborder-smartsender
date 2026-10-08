import { useRef, useState } from "react";
import jsQR from "jsqr";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePhoneCards } from "@/lib/phone-card-store";
import { activationError, activationFingerprint, availableCapacity, writeReasons, type Plan } from "@/lib/phone-cards";
import { CardPanel, CardField, ErrorNote } from "./card-common";

export function WriteProfilePanel({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const { state, setState } = usePhoneCards();
  const card = state.cards.find((c) => c.id === cardId);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [finished, setFinished] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  if (!card) return null;
  const target = card;
  const reasons = writeReasons(target, state.plans);

  async function pickFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("仅支持 PNG/JPEG，单图不超过 10 MB");
      return;
    }
    setReading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error();
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(pixels.data, pixels.width, pixels.height);
      if (qr?.data) {
        setCode(qr.data);
        setSource(file.name);
      } else {
        setError("未识别到二维码，请手动输入激活码");
      }
    } catch {
      setError("图片解析失败，请手动输入激活码");
    }
    setReading(false);
  }

  async function submit() {
    if (submitting.current) return;
    setError("");
    const trimmed = code.trim();
    const codeError = activationError(trimmed);
    if (codeError) {
      setError(codeError);
      return;
    }
    if (reasons.length) {
      setError(reasons.join("；"));
      return;
    }
    if (availableCapacity(target, state.plans) < 1) {
      setError("该白卡可用容量不足，无法写入");
      return;
    }
    submitting.current = true;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(activationFingerprint(trimmed)));
    const hash = Array.from(new Uint8Array(bytes)).map((v) => v.toString(16).padStart(2, "0")).join("");
    if (state.activationHashes.includes(hash)) {
      submitting.current = false;
      setError("该激活码已用于本次会话的写入，不可重复下发");
      return;
    }
    const now = new Date().toISOString();
    const plan: Plan = { id: crypto.randomUUID(), cardId: target.id, iccid: "", phone: null, region: "未知", country: "—", carrier: "未回传", supplier: "未回传", channel: "未回传", phoneSource: "未知", ims: "未知", connection: "未知", send: null, receive: null, smsc: "未知", image: false, status: "disabled", active: false, note: "写入套餐", tagIds: [], limit: null, used: 0, reserved: 0, diagnostic: "—", diagnosticAt: null, retryAt: null, updatedAt: now };
    setState((s) => ({
      ...s,
      activationHashes: [...s.activationHashes, hash],
      plans: [...s.plans, plan],
      jobs: [{ id: crypto.randomUUID(), at: now, type: "写卡", items: [{ cardId: target.id, label: `${target.note} · ${source || "手动输入"}`, state: "成功" }] }, ...s.jobs],
    }));
    setFinished(true);
  }

  return (
    <CardPanel
      title="写入 eSIM Profile"
      onClose={onClose}
      footer={
        finished ? (
          <Button onClick={onClose}>完成</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button disabled={reading || reasons.length > 0} onClick={() => void submit()}>提交写卡</Button>
          </>
        )
      }
    >
      {finished ? (
        <div className="py-12 text-center">
          <h3 className="text-xl font-semibold text-primary">写卡已提交</h3>
          <p className="mt-3 text-sm text-muted-foreground">新套餐已写入「{target.note}」，默认停用、未生效，可在套餐卡号视图中查看。</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">二维码只在本浏览器本地解析，不会上传或保存图片。</p>
          {reasons.length > 0 && <p className="rounded-md bg-warning-soft p-3 text-xs text-warning-foreground">该白卡当前不可写入：{reasons.join("；")}</p>}
          <CardField label="上传二维码图片">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={reading}>
              <Upload />{reading ? "正在本地识别…" : "选择图片"}
            </Button>
            <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => void pickFile(e.target.files)} />
          </CardField>
          <CardField label="激活码" required>
            <textarea aria-label="激活码" className="field min-h-28 font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LPA:1$SM-DP+$MATCHING-ID" />
          </CardField>
          <CardField label="Confirmation Code（可选）">
            <input type="password" aria-label="Confirmation Code" className="field" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </CardField>
          <ErrorNote text={error} />
        </>
      )}
    </CardPanel>
  );
}
