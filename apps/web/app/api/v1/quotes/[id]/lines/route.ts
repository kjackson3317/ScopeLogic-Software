import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const context = await getAlphaAppContext();

  if (context.state !== "ready") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const sectionId = typeof body?.sectionId === "string" ? body.sectionId : "";
  const lineType = typeof body?.lineType === "string" ? body.lineType : "material";
  const uom = typeof body?.uom === "string" && body.uom.trim() ? body.uom.trim().toUpperCase() : "EA";

  if (!sectionId || !description) {
    return NextResponse.json({ error: "Section and description are required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("add_manual_estimate_line", {
    quote_id_input: id,
    section_id_input: sectionId,
    line_type_input: lineType,
    manufacturer_input: typeof body?.manufacturer === "string" ? body.manufacturer.trim() || null : null,
    part_number_input: typeof body?.partNumber === "string" ? body.partNumber.trim() || null : null,
    description_input: description,
    uom_input: uom,
    quantity_input: numberOrZero(body?.quantity),
    unit_material_cost_input: numberOrZero(body?.unitMaterialCost),
    labor_hours_per_unit_input: numberOrZero(body?.laborHoursPerUnit),
    labor_rate_input: numberOrZero(body?.laborRate),
    unit_other_cost_input: numberOrZero(body?.unitOtherCost),
    unit_sell_input: numberOrZero(body?.unitSell)
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, lineId: data }, { status: 201 });
}
