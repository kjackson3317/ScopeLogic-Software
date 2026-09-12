import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../../lib/supabase/server";

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params;
  const context = await getAlphaAppContext();

  if (context.state !== "ready") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("update_manual_estimate_line", {
    quote_id_input: id,
    line_id_input: lineId,
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

  return NextResponse.json({ ok: true });
}
