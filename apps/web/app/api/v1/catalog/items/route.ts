import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

export async function GET(request: Request) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const requestedLimit = Number(searchParams.get("limit") ?? 40);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 40, 1), 100);
  const supabase = await createServerSupabaseClient();

  let catalogQuery = supabase
    .from("catalog_items")
    .select("id,item_type,manufacturer,part_number,description,category,uom,approved_cost")
    .eq("active", true)
    .order("manufacturer", { ascending: true, nullsFirst: false })
    .order("part_number", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (query) {
    const escaped = query.replaceAll(",", " ");
    catalogQuery = catalogQuery.or(
      `manufacturer.ilike.%${escaped}%,part_number.ilike.%${escaped}%,description.ilike.%${escaped}%`
    );
  }

  const { data, error } = await catalogQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request:Request){
 const c=await getAlphaAppContext();if(c.state!=="ready")return NextResponse.json({error:"Authentication required."},{status:401});
 const b=await request.json().catch(()=>null);const s=await createServerSupabaseClient();
 if(!b?.description)return NextResponse.json({error:"Description is required."},{status:400});
 const {data,error}=await s.rpc("create_catalog_item_v1",{
   item_type_input:b.itemType??"material",manufacturer_input:b.manufacturer||null,part_number_input:b.partNumber||null,
   description_input:b.description,category_input:b.category||null,uom_input:b.uom??"EA",approved_cost_input:Number(b.approvedCost??0)
 });
 if(error)return NextResponse.json({error:error.message},{status:400});
 return NextResponse.json({ok:true,itemId:data},{status:201});
}
