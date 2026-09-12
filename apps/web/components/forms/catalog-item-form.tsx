"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";

export function CatalogItemForm(){
  const router=useRouter();
  const [description,setDescription]=useState("");
  const [manufacturer,setManufacturer]=useState("");
  const [partNumber,setPartNumber]=useState("");
  const [category,setCategory]=useState("");
  const [uom,setUom]=useState("EA");
  const [itemType,setItemType]=useState("material");
  const [approvedCost,setApprovedCost]=useState("0");
  const [message,setMessage]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage(null);
    try{
      const r=await fetch("/api/v1/catalog/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        description,manufacturer:manufacturer||null,partNumber:partNumber||null,category:category||null,uom,itemType,approvedCost:Number(approvedCost)
      })});
      const j=await r.json();
      if(!r.ok){setMessage(j.error??"Unable to create item.");return;}
      router.push("/administration/catalog");router.refresh();
    }finally{setBusy(false)}
  }

  return <form className="form-panel" onSubmit={submit}><div className="field-grid">
    <label>Type<select value={itemType} onChange={e=>setItemType(e.target.value)}>
      <option value="material">Material</option><option value="equipment">Equipment</option><option value="labor">Labor</option>
      <option value="subcontract">Subcontract</option><option value="service">Service</option><option value="rental">Rental</option>
      <option value="allowance">Allowance</option><option value="fee">Fee</option><option value="misc">Misc</option>
    </select></label>
    <label>Manufacturer<input value={manufacturer} onChange={e=>setManufacturer(e.target.value)}/></label>
    <label>Part #<input value={partNumber} onChange={e=>setPartNumber(e.target.value)}/></label>
    <label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label>
    <label className="span-2">Description<input value={description} onChange={e=>setDescription(e.target.value)} required/></label>
    <label>UOM<input value={uom} onChange={e=>setUom(e.target.value.toUpperCase())} required/></label>
    <label>Approved Cost<input type="number" min="0" step="0.01" value={approvedCost} onChange={e=>setApprovedCost(e.target.value)}/></label>
  </div>{message?<div className="form-message">{message}</div>:null}<div className="form-actions"><button className="primary-button" disabled={busy}>{busy?"Creating...":"Create Item"}</button></div></form>
}
