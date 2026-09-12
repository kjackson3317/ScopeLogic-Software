"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";

export function QuantityInputForm({quoteId}:{quoteId:string}) {
  const router=useRouter();
  const [inputKey,setInputKey]=useState("");
  const [label,setLabel]=useState("");
  const [value,setValue]=useState("0");
  const [unit,setUnit]=useState("EA");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage(null);
    try{
      const r=await fetch(`/api/v1/quotes/${quoteId}/quantity-inputs`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({inputKey,label,value:Number(value),unit})
      });
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Unable to add quantity.");return;}
      setInputKey("");setLabel("");setValue("0");router.refresh();
    } finally {setBusy(false);}
  }

  return <form className="inline-data-form" onSubmit={submit}>
    <input placeholder="input_key" value={inputKey} onChange={e=>setInputKey(e.target.value)} required/>
    <input placeholder="Label" value={label} onChange={e=>setLabel(e.target.value)} required/>
    <input type="number" step="0.0001" value={value} onChange={e=>setValue(e.target.value)} required/>
    <input value={unit} onChange={e=>setUnit(e.target.value.toUpperCase())} required/>
    <button className="secondary-button" disabled={busy}>{busy?"Adding...":"Add Quantity"}</button>
    {message?<span className="inline-error">{message}</span>:null}
  </form>;
}
