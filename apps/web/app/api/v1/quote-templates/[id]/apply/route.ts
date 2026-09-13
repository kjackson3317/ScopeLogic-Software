import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAlphaAppContext();
  if (context.state !== "ready") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const quoteId = typeof body?.quoteId === "string" ? body.quoteId : "";
  if (!quoteId) return NextResponse.json({ error: "Target quote is required." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("apply_quote_template_to_quote_v1", {
    template_id_input: id,
    quote_id_input: quoteId
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, linesAdded: Number(data ?? 0) });
}
