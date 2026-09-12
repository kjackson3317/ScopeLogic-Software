import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { RevisionForm } from "../../../../components/quote/revision-form";
import { formatMoney, formatPercent } from "../../../../lib/format";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteHistoryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, name, current_version_id")
    .eq("id", id)
    .maybeSingle();

  if (!quote) {
    notFound();
  }

  const { data: versions } = await supabase
    .from("quote_versions")
    .select(`
      id,
      display_version,
      status,
      revision_reason,
      revision_notes,
      material_cost,
      labor_cost,
      other_cost,
      total_cost,
      final_sell_price,
      created_at,
      finalized_at
    `)
    .eq("quote_id", quote.id)
    .order("version_major", { ascending: false })
    .order("version_minor", { ascending: false });

  const current = versions?.find((version) => version.id === quote.current_version_id) ?? versions?.[0];

  return (
    <AppShell>
      <div className="quote-workspace-header">
        <div>
          <p className="section-kicker">Quote History</p>
          <h1>{quote.quote_number} · {quote.name}</h1>
          <p className="page-description">Every issued or superseded version remains preserved as a pricing snapshot.</p>
        </div>
      </div>

      <QuoteTabs quoteId={quote.id} active="history" />

      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Created</th>
                <th className="numeric">Cost</th>
                <th className="numeric">Sell</th>
                <th className="numeric">Margin</th>
                <th>Current</th>
              </tr>
            </thead>
            <tbody>
              {versions?.map((version) => {
                const grossProfit = Number(version.final_sell_price) - Number(version.total_cost);
                const margin = Number(version.final_sell_price) > 0
                  ? (grossProfit / Number(version.final_sell_price)) * 100
                  : 0;

                return (
                  <tr key={version.id}>
                    <td><strong>{version.display_version}</strong></td>
                    <td><span className="status status-neutral">{version.status}</span></td>
                    <td>{version.revision_reason ?? "—"}</td>
                    <td>{new Date(version.created_at).toLocaleString("en-US")}</td>
                    <td className="numeric">{formatMoney(version.total_cost)}</td>
                    <td className="numeric">{formatMoney(version.final_sell_price)}</td>
                    <td className="numeric">{formatPercent(margin)}</td>
                    <td>{version.id === quote.current_version_id ? "Yes" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {current ? (
        <section className="history-revision-section">
          <RevisionForm quoteId={quote.id} currentVersion={current.display_version} />
        </section>
      ) : null}
    </AppShell>
  );
}
