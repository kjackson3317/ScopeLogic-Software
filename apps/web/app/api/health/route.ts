import { NextResponse } from "next/server";
import { getSupabaseConfig } from "../../../lib/supabase/config";

export function GET() {
  const config = getSupabaseConfig();

  return NextResponse.json({
    ok: true,
    product: "ScopeLogic Software",
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? "unknown",
    supabaseConfigured: config.configured
  });
}
