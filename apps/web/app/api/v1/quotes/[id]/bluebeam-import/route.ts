import { NextResponse } from "next/server";
import { getAlphaAppContext } from "../../../../../../lib/auth/app-context";
import { createServerSupabaseClient } from "../../../../../../lib/supabase/server";

type ImportedQuantity = { inputKey: string; label: string; value: number; unit: "EA" };
type Mapping = {
  sourceKey: string; subject: string; color: string; label: string;
  shape: string; deviceCode: string; inputKey: string; excluded: boolean;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAlphaAppContext();
  if (context.state !== "ready" || !context.enabledModules.includes("rules")) {
    return NextResponse.json({ error: "Access to the Rules Engine is required." }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const filename = typeof payload?.filename === "string" ? payload.filename.trim() : "";
  const inputs: unknown[] = Array.isArray(payload?.inputs) ? payload.inputs : [];
  const mappings: unknown[] = Array.isArray(payload?.mappings) ? payload.mappings : [];
  if (!filename || filename.length > 255 || !/\.csv$/i.test(filename) ||
      inputs.length < 1 || inputs.length > 1000 || mappings.length < 1 || mappings.length > 1000) {
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

  const mappingKeys = new Set<string>();
  const validatedMappings: Mapping[] = [];
  for (const item of mappings) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Invalid symbol mapping." }, { status: 400 });
    }
    const entry = item as Record<string, unknown>;
    const sourceKey = entry.sourceKey;
    const subject = entry.subject;
    const color = entry.color;
    const label = entry.label;
    const shape = entry.shape;
    const deviceCode = entry.deviceCode;
    const inputKey = entry.inputKey;
    const excluded = entry.excluded;
    if (typeof sourceKey !== "string" || sourceKey.length < 1 || sourceKey.length > 1024 ||
        mappingKeys.has(sourceKey) || typeof subject !== "string" || !subject.trim() ||
        subject.length > 255 || [color,label,shape,deviceCode,inputKey].some(
          value => typeof value !== "string" || value.length > 255
        ) || typeof excluded !== "boolean" ||
        (!excluded && (!inputKey || !keys.has(inputKey as string))) ||
        (excluded && inputKey !== "")) {
      return NextResponse.json({ error: "Invalid, duplicate, or unresolved symbol mapping." }, { status: 400 });
    }
    mappingKeys.add(sourceKey);
    validatedMappings.push({
      sourceKey, subject, color: color as string, label: label as string,
      shape: shape as string, deviceCode: deviceCode as string,
      inputKey: inputKey as string, excluded
    });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("apply_bluebeam_quantity_snapshot", {
    quote_id_input: id,
    filename_input: filename,
    inputs_input: quantities,
    mappings_input: validatedMappings
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, importId: data, inputCount: quantities.length });
}
