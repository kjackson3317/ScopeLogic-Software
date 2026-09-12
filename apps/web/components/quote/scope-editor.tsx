"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScopeEditor({
  quoteId, initial
}:{
  quoteId:string;
  initial:{scope:string;inclusions:string;exclusions:string;assumptions:string;clarifications:string}
}) {
  const router=useRouter();
  const [data,setData]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const set=(key:keyof typeof data,value:string)=>setData(current=>({...current,[key]:value}));

  async function save(){
    setBusy(true);setMessage(null);
    try{
      const r=await fetch(`/api/v1/quotes/${quoteId}/scope`,{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
      });
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Unable to save scope.");return;}
      setMessage("Saved");router.refresh();
    } finally {setBusy(false);}
  }

  return <section className="scope-editor">
    {(["scope","inclusions","exclusions","assumptions","clarifications"] as const).map(key=>
      <label key={key}>
        {key.charAt(0).toUpperCase()+key.slice(1)}
        <textarea rows={key==="scope"?8:5} value={data[key]} onChange={e=>set(key,e.target.value)}/>
      </label>
    )}
    <div className="form-actions">
      {message?<span className="save-state">{message}</span>:null}
      <button className="primary-button" type="button" onClick={save} disabled={busy}>{busy?"Saving...":"Save Scope"}</button>
    </div>
  </section>;
}
