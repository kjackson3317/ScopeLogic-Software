import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteAlternatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: quote } = await supabase.from("quotes").select("id, quote_number, name").eq("id", id).maybeSingle();
  if (!quote) notFound();

  return (
    <AppShell>
      <div className="quote-workspace-header">
        <div><p className="section-kicker">Alternates</p><h1>{quote.quote_number} · {quote.name}</h1></div>
      </div>
      <QuoteTabs quoteId={quote.id} active="alternates" />
      <section className="panel empty-state compact-empty">
        <div className="empty-icon">ALT</div>
        <h2>Independent Add / Deduct alternates</h2>
        <p>Alternate BOM, labor, sell, scope, and proposal visibility will be added after the base estimate workflow is stable.</p>
      </section>
    </AppShell>
  );
}
