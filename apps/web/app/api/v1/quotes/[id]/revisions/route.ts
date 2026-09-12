import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

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

  const revisionType =
    body?.revisionType === "change_order" ? "change_order" : "regular";
  const reason = typeof body?.reason === "string" && body.reason.trim()
    ? body.reason.trim()
    : "Other";
  const notes = typeof body?.notes === "string" && body.notes.trim()
    ? body.notes.trim()
    : null;
  const pricingAction =
    body?.pricingAction === "review_changes" || body?.pricingAction === "update_current"
      ? body.pricingAction
      : "keep_previous";

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_quote_revision", {
    quote_id_input: id,
    revision_type_input: revisionType,
    revision_reason_input: reason,
    revision_notes_input: notes,
    pricing_action_input: pricingAction
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, versionId: data }, { status: 201 });
}
