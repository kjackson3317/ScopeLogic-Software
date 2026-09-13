import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") {
    return NextResponse.json({ error: "Authentication and organization setup are required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_quote_template_v1", {
    template_name_input: name,
    description_input: typeof body?.description === "string" ? body.description : null,
    trade_scope_input: typeof body?.tradeScope === "string" ? body.tradeScope : null,
    default_material_markup_input: Number(body?.defaultMaterialMarkup ?? 1.2)
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, templateId: data }, { status: 201 });
}
