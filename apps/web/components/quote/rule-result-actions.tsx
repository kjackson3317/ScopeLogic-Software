"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RuleResultActions({
  quoteId,resultId,behavior,status,sections
}:{
  quoteId:string;resultId:string;behavior:string;status:string;sections:{id:string;name:string}[]
}) {
  const router=useRouter();
  const [sectionId,setSectionId]=useState(sections[0]?.id??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  if(behavior!=="recommend_bom"||status!=="pending") return null;

  async function accept(){
    setBusy(true);setMessage(null);
    try{
      const r=await fetch(`/api/v1/quotes/${quoteId}/rules/results/${resultId}/accept`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sectionId})
      });
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Unable to accept recommendation.");return;}
      router.refresh();
    } finally {setBusy(false);}
  }

  return <div className="rule-result-actions">
    <select value={sectionId} onChange={e=>setSectionId(e.target.value)}>
      {sections.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
    </select>
    <button className="secondary-button" type="button" onClick={accept} disabled={busy||!sectionId}>
      {busy?"Adding...":"Accept to BOM"}
    </button>
    {message?<span className="inline-error">{message}</span>:null}
  </div>;
}
