"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RuleForm({ catalogItems }: { catalogItems: {id:string;description:string;part_number:string|null}[] }) {
  const router = useRouter();
  const [name,setName] = useState("");
  const [category,setCategory] = useState("");
  const [inputKey,setInputKey] = useState("");
  const [inputLabel,setInputLabel] = useState("");
  const [factor,setFactor] = useState("1");
  const [waste,setWaste] = useState("0");
  const [behavior,setBehavior] = useState("calculate_only");
  const [outputLabel,setOutputLabel] = useState("");
  const [outputUnit,setOutputUnit] = useState("EA");
  const [catalogItemId,setCatalogItemId] = useState("");
  const [message,setMessage] = useState<string|null>(null);
  const [busy,setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null);
    try {
      const r = await fetch("/api/v1/rules", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          name,category,inputKey,inputLabel,factor:Number(factor),wastePercent:Number(waste),
          behavior,outputLabel,outputUnit,catalogItemId:catalogItemId || null
        })
      });
      const j = await r.json();
      if (!r.ok) { setMessage(j.error ?? "Unable to create rule."); return; }
      router.push("/rules-engine"); router.refresh();
    } finally { setBusy(false); }
  }

  return <form className="form-panel" onSubmit={submit}>
    <div className="field-grid">
      <label>Rule Name<input value={name} onChange={e=>setName(e.target.value)} required /></label>
      <label>Category<input value={category} onChange={e=>setCategory(e.target.value)} /></label>
      <label>Input Key<input value={inputKey} onChange={e=>setInputKey(e.target.value)} placeholder="single_data_outlet" required /></label>
      <label>Input Label<input value={inputLabel} onChange={e=>setInputLabel(e.target.value)} placeholder="Single Data Outlet" required /></label>
      <label>Factor<input type="number" step="0.0001" value={factor} onChange={e=>setFactor(e.target.value)} /></label>
      <label>Waste %<input type="number" step="0.01" value={waste} onChange={e=>setWaste(e.target.value)} /></label>
      <label>Behavior<select value={behavior} onChange={e=>setBehavior(e.target.value)}>
        <option value="calculate_only">Calculate Only</option>
        <option value="recommend_bom">Recommend BOM</option>
      </select></label>
      <label>Output Unit<input value={outputUnit} onChange={e=>setOutputUnit(e.target.value.toUpperCase())} /></label>
      <label className="span-2">Output Label<input value={outputLabel} onChange={e=>setOutputLabel(e.target.value)} required /></label>
      <label className="span-2">Catalog Item for Recommendation<select value={catalogItemId} onChange={e=>setCatalogItemId(e.target.value)}>
        <option value="">No catalog item</option>
        {catalogItems.map(i=><option value={i.id} key={i.id}>{[i.part_number,i.description].filter(Boolean).join(" · ")}</option>)}
      </select></label>
    </div>
    {message ? <div className="form-message">{message}</div> : null}
    <div className="form-actions"><button className="primary-button" disabled={busy}>{busy ? "Creating..." : "Create Rule"}</button></div>
  </form>;
}
