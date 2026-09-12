import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: quote } = await supabase.from("quotes").select("id, quote_number, name").eq("id", id).maybeSingle();
  if (!quote) notFound();

  return (
    <AppShell>
      <div className="quote-workspace-header">
        <div><p className="section-kicker">Proposal</p><h1>{quote.quote_number} · {quote.name}</h1></div>
      </div>
      <QuoteTabs quoteId={quote.id} active="proposal" />
      <section className="panel empty-state compact-empty">
        <div className="empty-icon">PDF</div>
        <h2>Customer Proposal Preview</h2>
        <p>Proposal Profiles and branded HTML/PDF rendering will follow the Catalog/Pricing foundation.</p>
      </section>
    </AppShell>
  );
}
