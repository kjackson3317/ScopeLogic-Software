import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const b=await request.json().catch(()=>null); const s=await createServerSupabaseClient();
  const {data,error}=await s.rpc("upsert_quantity_input",{
    quote_id_input:id,input_key_input:b?.inputKey,label_input:b?.label,
    value_input:Number(b?.value??0),unit_input:b?.unit??"EA",source_type_input:"manual"
  });
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true,id:data},{status:201});
}
