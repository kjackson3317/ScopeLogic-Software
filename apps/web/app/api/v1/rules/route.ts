import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(request:Request){
  const c=await getAlphaAppContext();
  if(c.state!=="ready") return NextResponse.json({error:"Authentication required."},{status:401});
  const b=await request.json().catch(()=>null); const s=await createServerSupabaseClient();
  const {data,error}=await s.rpc("create_rule_v1",{
    rule_name_input:b?.name,category_input:b?.category||null,input_key_input:b?.inputKey,
    input_label_input:b?.inputLabel,factor_input:Number(b?.factor??1),
    waste_percent_input:Number(b?.wastePercent??0),behavior_input:b?.behavior??"calculate_only",
    output_label_input:b?.outputLabel,output_unit_input:b?.outputUnit??"EA",
    catalog_item_id_input:b?.catalogItemId||null
  });
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true,ruleId:data},{status:201});
}
