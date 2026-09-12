"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
export function SupplierForm(){
 const router=useRouter();const [name,setName]=useState("");const [code,setCode]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage(null);try{const r=await fetch("/api/v1/suppliers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,code:code||null})});const j=await r.json();if(!r.ok){setMessage(j.error??"Unable to create supplier.");return;}setName("");setCode("");router.refresh();}finally{setBusy(false)}}
 return <form className="inline-data-form" onSubmit={submit}><input placeholder="Supplier name" value={name} onChange={e=>setName(e.target.value)} required/><input placeholder="Code" value={code} onChange={e=>setCode(e.target.value)}/><button className="secondary-button" disabled={busy}>{busy?"Creating...":"Add Supplier"}</button>{message?<span className="inline-error">{message}</span>:null}</form>
}
