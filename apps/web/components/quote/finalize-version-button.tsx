"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FinalizeVersionButton({
  quoteId,version
}:{quoteId:string;version:string}) {
  const router=useRouter();
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function finalize(){
    setBusy(true);setMessage(null);
    try{
      const r=await fetch(`/api/v1/quotes/${quoteId}/finalize`,{method:"POST"});
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Unable to finalize version.");return;}
      setConfirming(false);router.refresh();
    } catch {
      setMessage("Unable to finalize version.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="version-action-stack">
    {!confirming ? (
      <button className="secondary-button" type="button" onClick={()=>setConfirming(true)}>
        Finalize {version}
      </button>
    ) : (
      <div className="inline-confirm-panel" role="dialog" aria-label={`Finalize version ${version}`}>
        <strong>Finalize {version}?</strong>
        <span>This version will become read-only. Create a revision for later changes.</span>
        <div>
          <button className="secondary-button" type="button" onClick={()=>setConfirming(false)} disabled={busy}>Cancel</button>
          <button className="primary-button" type="button" onClick={finalize} disabled={busy}>
            {busy?"Finalizing...":"Confirm Finalize"}
          </button>
        </div>
      </div>
    )}
    {message?<span className="inline-error">{message}</span>:null}
  </div>;
}
