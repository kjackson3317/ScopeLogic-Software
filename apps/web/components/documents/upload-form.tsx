"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentUploadForm({projectId,folders}:{projectId:string;folders:{id:string;name:string}[]}) {
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [folderId,setFolderId]=useState(folders[0]?.id??"");
  const [kind,setKind]=useState("general");
  const [controlled,setControlled]=useState(false);
  const [revision,setRevision]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!file) return;
    setBusy(true);setMessage(null);
    try{
      const form=new FormData();
      form.append("file",file);form.append("projectId",projectId);form.append("folderId",folderId);
      form.append("documentKind",kind);form.append("controlled",String(controlled));form.append("revision",revision);
      const r=await fetch("/api/v1/documents/upload",{method:"POST",body:form});
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Upload failed.");return;}
      setFile(null);setRevision("");router.refresh();
    } finally {setBusy(false);}
  }

  return <form className="document-upload-form" onSubmit={submit}>
    <input type="file" onChange={e=>setFile(e.target.files?.[0]??null)} required/>
    <select value={folderId} onChange={e=>setFolderId(e.target.value)} required>
      {folders.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}
    </select>
    <select value={kind} onChange={e=>setKind(e.target.value)}>
      <option value="general">General File</option><option value="drawing">Drawing Set</option>
      <option value="specification">Specification</option><option value="addendum">Addendum</option>
      <option value="rfi">RFI</option><option value="vendor_quote">Vendor Quote</option>
    </select>
    <label className="check-label"><input type="checkbox" checked={controlled} onChange={e=>setControlled(e.target.checked)}/> Controlled</label>
    {controlled?<input value={revision} onChange={e=>setRevision(e.target.value)} placeholder="Revision"/>:null}
    <button className="primary-button" disabled={busy||!file}>{busy?"Uploading...":"Upload"}</button>
    {message?<span className="inline-error">{message}</span>:null}
  </form>;
}
