import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../../../../lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string;resultId:string}>}){
  const {id,resultId}=await params;
  const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const body=await request.json().catch(()=>null);
  const s=await createServerSupabaseClient();
  const {data,error}=await s.rpc("accept_rule_result_to_bom",{
    quote_id_input:id,result_id_input:resultId,section_id_input:body?.sectionId
  });
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true,lineId:data},{status:201});
}
