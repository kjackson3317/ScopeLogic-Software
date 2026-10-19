import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/page-header";
import { getAlphaAppContext } from "../lib/auth/app-context";
import { createServerSupabaseClient } from "../lib/supabase/server";

export default async function HomePage() {
  const context = await getAlphaAppContext();
  let quotes = 0, catalog = 0, rules = 0;
  if (context.state === "ready") {
    const supabase = await createServerSupabaseClient();
    const counts = await Promise.all([
      supabase.from("quotes").select("id", { count: "exact", head: true }),
      supabase.from("catalog_items").select("id", { count: "exact", head: true }),
      supabase.from("rules").select("id", { count: "exact", head: true })
    ]);
    quotes = counts[0].count ?? 0;
    catalog = counts[1].count ?? 0;
    rules = counts[2].count ?? 0;
  }

  return <AppShell>
    <PageHeader eyebrow="ScopeLogic Demonstration" title="Quote Builder"
      description="Takeoff counts from Bluebeam, ScopeLogic rules, centralized parts and labor, and a reviewable estimate." />
    <section className="quote-summary-strip">
      <article><span>Quotes</span><strong>{quotes}</strong></article>
      <article><span>Catalog Items</span><strong>{catalog}</strong></article>
      <article><span>Rules</span><strong>{rules}</strong></article>
    </section>
    <div className="content-grid">
      <section className="panel">
        <h2>Start a Quote</h2>
        <p>Open an existing estimate or create a new quote for a demo project.</p>
        <Link className="primary-button link-button" href="/quotes">Open Quote Builder</Link>
        <p className="page-description">If needed, set up a customer and project first.</p>
        <Link href="/projects/new">Create Project</Link>
        <span> · </span>
        <Link href="/crm/customers/new">Create Customer</Link>
      </section>
      <section className="panel">
        <h2>Bluebeam → ScopeLogic</h2>
        <p>Use Revu Markups List CSV Summary in a draft quote's Quantities tab. Review Subject mapping and changes before syncing. Run rules and explicitly accept BOM recommendations.</p>
        <p className="page-description">Bluebeam integration is count-only for this demo. Studio API integration requires Bluebeam OAuth and production approval.</p>
        <Link href="/rules-engine">Configure Rules</Link>
        <span> · </span>
        <Link href="/administration/catalog">Open Parts Database</Link>
      </section>
    </div>
  </AppShell>;
}
