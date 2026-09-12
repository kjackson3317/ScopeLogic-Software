import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

const allowedStatuses = new Set([
  "opportunity",
  "estimating",
  "submitted",
  "pending_award",
  "awarded",
  "active"
]);

export async function POST(request: Request) {
  const context = await getAlphaAppContext();

  if (context.state !== "ready") {
    return NextResponse.json({ error: "Authentication and organization setup are required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectNumber = typeof body?.projectNumber === "string" ? body.projectNumber.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const status = typeof body?.status === "string" && allowedStatuses.has(body.status)
    ? body.status
    : "estimating";
  const customerId = typeof body?.customerId === "string" && body.customerId ? body.customerId : null;
  const bidDate = typeof body?.bidDate === "string" && body.bidDate ? body.bidDate : null;

  if (!projectNumber || !name) {
    return NextResponse.json({ error: "Project number and project name are required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_project_for_current_org", {
    project_number_input: projectNumber,
    project_name_input: name,
    customer_id_input: customerId,
    project_status_input: status,
    bid_date_input: bidDate
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, projectId: data }, { status: 201 });
}
