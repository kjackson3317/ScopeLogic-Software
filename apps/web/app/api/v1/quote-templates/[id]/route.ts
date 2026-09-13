import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_quote_template_v1", {
    template_id_input: id,
    template_name_input: name,
    description_input: typeof body?.description === "string" ? body.description : null,
    trade_scope_input: typeof body?.tradeScope === "string" ? body.tradeScope : null,
    default_material_markup_input: Number(body?.defaultMaterialMarkup ?? 1.2),
    active_input: body?.active !== false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("delete_quote_template_v1", { template_id_input: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
