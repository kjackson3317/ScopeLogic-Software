import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const sectionId = typeof body?.sectionId === "string" ? body.sectionId : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!sectionId || !description) {
    return NextResponse.json({ error: "Section and description are required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("add_quote_template_line_v1", {
    template_id_input: id,
    section_id_input: sectionId,
    line_type_input: body?.lineType ?? "material",
    catalog_item_id_input: typeof body?.catalogItemId === "string" && body.catalogItemId ? body.catalogItemId : null,
    manufacturer_input: body?.manufacturer ?? null,
    part_number_input: body?.partNumber ?? null,
    description_input: description,
    uom_input: body?.uom ?? "EA",
    quantity_input: Number(body?.quantity ?? 1),
    unit_material_cost_input: Number(body?.unitMaterialCost ?? 0),
    labor_hours_per_unit_input: Number(body?.laborHoursPerUnit ?? 0),
    labor_rate_input: Number(body?.laborRate ?? 0),
    unit_other_cost_input: Number(body?.unitOtherCost ?? 0),
    unit_sell_input: Number(body?.unitSell ?? 0),
    show_on_bom_input: body?.showOnBom !== false
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, lineId: data }, { status: 201 });
}
