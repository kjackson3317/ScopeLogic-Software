import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
export async function POST(request:Request){const c=await getAlphaAppContext();if(c.state!=="ready")return NextResponse.json({error:"Authentication required."},{status:401});const b=await request.json().catch(()=>null);const s=await createServerSupabaseClient();const {data,error}=await s.rpc("create_supplier_v1",{supplier_name_input:b?.name,supplier_code_input:b?.code||null});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true,supplierId:data},{status:201})}
