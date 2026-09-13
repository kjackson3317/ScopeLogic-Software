import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { lineId } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.sectionId) return NextResponse.json({ error: "Section is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_quote_template_line_v1", {
    line_id_input: lineId,
    section_id_input: body.sectionId,
    quantity_input: Number(body?.quantity ?? 0),
    unit_material_cost_input: Number(body?.unitMaterialCost ?? 0),
    labor_hours_per_unit_input: Number(body?.laborHoursPerUnit ?? 0),
    labor_rate_input: Number(body?.laborRate ?? 0),
    unit_other_cost_input: Number(body?.unitOtherCost ?? 0),
    unit_sell_input: Number(body?.unitSell ?? 0),
    show_on_bom_input: body?.showOnBom !== false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { lineId } = await params;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_quote_template_line_v1", { line_id_input: lineId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
