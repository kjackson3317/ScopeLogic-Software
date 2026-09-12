import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../../lib/supabase/server";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const s=await createServerSupabaseClient();
  const {data,error}=await s.rpc("run_rules_for_quote",{quote_id_input:id});
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true,runId:data});
}
