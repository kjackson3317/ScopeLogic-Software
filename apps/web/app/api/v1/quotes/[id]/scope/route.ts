import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const b=await request.json().catch(()=>null);const s=await createServerSupabaseClient();
  const {error}=await s.rpc("upsert_quote_scope",{
    quote_id_input:id,scope_text_input:b?.scope??"",inclusions_input:b?.inclusions??"",
    exclusions_input:b?.exclusions??"",assumptions_input:b?.assumptions??"",clarifications_input:b?.clarifications??""
  });
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
