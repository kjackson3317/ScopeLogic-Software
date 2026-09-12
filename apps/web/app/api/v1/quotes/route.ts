import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const context = await getAlphaAppContext();

  if (context.state !== "ready") {
    return NextResponse.json({ error: "Authentication and organization setup are required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const quoteNumber = typeof body?.quoteNumber === "string" ? body.quoteNumber.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const tradeScope = typeof body?.tradeScope === "string" && body.tradeScope.trim()
    ? body.tradeScope.trim()
    : null;

  if (!projectId || !quoteNumber || !name) {
    return NextResponse.json(
      { error: "Project, quote number, and quote name are required." },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_quote_with_initial_version", {
    project_id_input: projectId,
    quote_number_input: quoteNumber,
    quote_name_input: name,
    trade_scope_input: tradeScope
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, quoteId: data }, { status: 201 });
}
