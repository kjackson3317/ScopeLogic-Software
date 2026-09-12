import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { EstimateLineForm } from "../../../components/quote/estimate-line-form";
import { FinalizeVersionButton } from "../../../components/quote/finalize-version-button";
import { LineEditor } from "../../../components/quote/line-editor";
import { QuoteTabs } from "../../../components/quote/quote-tabs";
import { SectionForm } from "../../../components/quote/section-form";
import { formatMoney, formatPercent } from "../../../lib/format";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function QuoteWorkspacePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, name, trade_scope, status, project_id, current_version_id")
    .eq("id", id)
    .maybeSingle();

  if (!quote || !quote.current_version_id) {
    notFound();
  }

  const [{ data: project }, { data: version }, { data: sections }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, project_number, name")
      .eq("id", quote.project_id)
      .single(),
    supabase
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
        sell_price,
        negotiated_adjustment,
        final_sell_price,
        finalized_at
      `)
      .eq("id", quote.current_version_id)
      .single(),
    supabase
      .from("estimate_sections")
      .select("id, name, sort_order")
      .eq("quote_version_id", quote.current_version_id)
      .order("sort_order")
  ]);

  if (!version) {
    notFound();
  }

  const { data: lines } = await supabase
    .from("estimate_lines")
    .select(`
      id,
      section_id,
      line_type,
      source_type,
      manufacturer,
      part_number,
      description,
      uom,
      quantity,
      unit_material_cost,
      labor_hours_per_unit,
      labor_rate,
      unit_other_cost,
      unit_sell,
      material_cost,
      labor_cost,
      other_cost,
      total_cost,
      extended_sell,
      gross_profit,
      margin_pct,
      sort_order
    `)
    .eq("quote_version_id", version.id)
    .order("sort_order");

  const draft = version.status === "draft";
  const grossProfit = Number(version.final_sell_price) - Number(version.total_cost);
  const marginPct = Number(version.final_sell_price) > 0
    ? (grossProfit / Number(version.final_sell_price)) * 100
    : 0;

  return (
    <AppShell>
      <div className="quote-workspace-header">
        <div>
          <p className="section-kicker">{project?.project_number} · {project?.name}</p>
          <h1>{quote.quote_number} · {quote.name}</h1>
          <div className="quote-meta-line">
            <span>Version <strong>{version.display_version}</strong></span>
            <span className="status status-neutral">{version.status}</span>
            <span className="status status-neutral">{quote.status.replaceAll("_", " ")}</span>
            {quote.trade_scope ? <span>{quote.trade_scope}</span> : null}
          </div>
        </div>

        <div className="quote-header-actions">
          {draft ? (
            <FinalizeVersionButton quoteId={quote.id} version={version.display_version} />
          ) : (
            <a className="primary-button link-button" href={`/quotes/${quote.id}/history`}>
              Create Revision
            </a>
          )}
        </div>
      </div>

      <QuoteTabs quoteId={quote.id} active="estimate" />

      <section className="quote-summary-strip">
        <article><span>Material Cost</span><strong>{formatMoney(version.material_cost)}</strong></article>
        <article><span>Labor Cost</span><strong>{formatMoney(version.labor_cost)}</strong></article>
        <article><span>Other Cost</span><strong>{formatMoney(version.other_cost)}</strong></article>
        <article><span>Total Cost</span><strong>{formatMoney(version.total_cost)}</strong></article>
        <article><span>Final Sell</span><strong>{formatMoney(version.final_sell_price)}</strong></article>
        <article><span>Gross Profit</span><strong>{formatMoney(grossProfit)}</strong></article>
        <article><span>Margin</span><strong>{formatPercent(marginPct)}</strong></article>
      </section>

      {!draft ? (
        <div className="read-only-banner">
          Version {version.display_version} is {version.status} and read-only. Create a revision to make estimate changes.
        </div>
      ) : null}

      <section className="panel estimate-workspace">
        <div className="panel-heading estimate-heading">
          <div>
            <p className="section-kicker">Estimate</p>
            <h2>Structured BOM & Labor</h2>
          </div>
          <SectionForm quoteId={quote.id} disabled={!draft} />
        </div>

        <div className="table-wrap estimate-table-wrap">
          <table className="data-table estimate-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Type</th>
                <th>Mfr</th>
                <th>Part #</th>
                <th>Description</th>
                <th className="numeric">Qty</th>
                <th>UOM</th>
                <th className="numeric">Unit Cost</th>
                <th className="numeric">Mat. Cost</th>
                <th className="numeric">Labor Hrs</th>
                <th className="numeric">Labor Cost</th>
                <th className="numeric">Sell</th>
                <th className="numeric">Margin</th>
                <th>Source</th>
                {draft ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {sections?.map((section) => {
                const sectionLines = lines?.filter((line) => line.section_id === section.id) ?? [];

                return sectionLines.length ? sectionLines.map((line, index) => (
                  <tr key={line.id}>
                    <td>{index === 0 ? <strong>{section.name}</strong> : ""}</td>
                    <td>{line.line_type}</td>
                    <td>{line.manufacturer ?? "—"}</td>
                    <td className="mono">{line.part_number ?? "—"}</td>
                    <td><strong>{line.description}</strong></td>
                    <td className="numeric">{Number(line.quantity).toLocaleString()}</td>
                    <td>{line.uom}</td>
                    <td className="numeric">{formatMoney(line.unit_material_cost)}</td>
                    <td className="numeric">{formatMoney(line.material_cost)}</td>
                    <td className="numeric">{Number(line.labor_hours_per_unit * line.quantity).toFixed(2)}</td>
                    <td className="numeric">{formatMoney(line.labor_cost)}</td>
                    <td className="numeric">{formatMoney(line.extended_sell)}</td>
                    <td className="numeric">{formatPercent(line.margin_pct)}</td>
                    <td><span className="status status-neutral">{line.source_type}</span></td>
                    {draft ? (
                      <td>
                        <LineEditor
                          quoteId={quote.id}
                          line={{
                            id: line.id,
                            quantity: Number(line.quantity),
                            unit_material_cost: Number(line.unit_material_cost),
                            labor_hours_per_unit: Number(line.labor_hours_per_unit),
                            labor_rate: Number(line.labor_rate),
                            unit_other_cost: Number(line.unit_other_cost),
                            unit_sell: Number(line.unit_sell)
                          }}
                        />
                      </td>
                    ) : null}
                  </tr>
                )) : (
                  <tr key={section.id}>
                    <td><strong>{section.name}</strong></td>
                    <td colSpan={draft ? 14 : 13} className="section-empty-row">No lines in this section.</td>
                  </tr>
                );
              })}

              {!sections?.length ? (
                <tr>
                  <td colSpan={draft ? 15 : 14} className="table-empty">
                    This Quote Version has no estimate sections.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <EstimateLineForm
          quoteId={quote.id}
          sections={(sections ?? []).map((section) => ({ id: section.id, name: section.name }))}
          disabled={!draft || !sections?.length}
        />
      </section>
    </AppShell>
  );
}
