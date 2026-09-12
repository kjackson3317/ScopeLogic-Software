"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunRulesButton({quoteId}:{quoteId:string}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);
  async function run(){
    setBusy(true);setMessage(null);
    try{
      const r=await fetch(`/api/v1/quotes/${quoteId}/rules/run`,{method:"POST"});
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Rule run failed.");return;}
      router.refresh();
    } finally {setBusy(false);}
  }
  return <div className="version-action-stack">
    <button className="primary-button" type="button" onClick={run} disabled={busy}>{busy?"Calculating...":"Run Rules"}</button>
    {message?<span className="inline-error">{message}</span>:null}
  </div>;
}
