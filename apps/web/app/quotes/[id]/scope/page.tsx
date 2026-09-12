import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: quote } = await supabase.from("quotes").select("id, quote_number, name").eq("id", id).maybeSingle();
  if (!quote) notFound();

  return (
    <AppShell>
      <div className="quote-workspace-header">
        <div><p className="section-kicker">Quote Scope</p><h1>{quote.quote_number} · {quote.name}</h1></div>
      </div>
      <QuoteTabs quoteId={quote.id} active="scope" />
      <section className="panel empty-state compact-empty">
        <div className="empty-icon">SC</div>
        <h2>Scope, inclusions, exclusions, assumptions, and clarifications</h2>
        <p>The structured Scope editor is intentionally deferred until the estimate foundation is proven.</p>
      </section>
    </AppShell>
  );
}
