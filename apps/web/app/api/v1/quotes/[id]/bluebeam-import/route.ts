import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

type ImportedQuantity = { inputKey: string; label: string; value: number; unit: "EA" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAlphaAppContext();
  if (context.state !== "ready" || !context.enabledModules.includes("rules")) {
    return NextResponse.json({ error: "Access to the Rules Engine is required." }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const filename = typeof payload?.filename === "string" ? payload.filename.trim() : "";
  const inputs: unknown[] = Array.isArray(payload?.inputs) ? payload.inputs : [];
  if (!filename || filename.length > 255 || !/\.csv$/i.test(filename) ||
      inputs.length < 1 || inputs.length > 1000) {
    return NextResponse.json({ error: "Provide a CSV filename and between 1 and 1,000 mapped symbols." }, { status: 400 });
  }
  const keys = new Set<string>();
  const quantities: ImportedQuantity[] = [];
  for (const item of inputs) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Invalid quantity row." }, { status: 400 });
    }
    const entry = item as Record<string, unknown>;
    const inputKey = typeof entry.inputKey === "string" ? entry.inputKey.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    const value = entry.value;
    if (!inputKey || inputKey.length > 120 || keys.has(inputKey) ||
        !label || label.length > 255 || typeof value !== "number" ||
        !Number.isSafeInteger(value) || value < 1 || value > 10_000_000) {
      return NextResponse.json({ error: "Each symbol key must be unique and have a positive whole-number quantity." }, { status: 400 });
    }
    keys.add(inputKey);
    quantities.push({ inputKey, label, value, unit: "EA" });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("apply_bluebeam_quantity_snapshot", {
    quote_id_input: id,
    filename_input: filename,
    inputs_input: quantities
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, importId: data, inputCount: quantities.length });
}
