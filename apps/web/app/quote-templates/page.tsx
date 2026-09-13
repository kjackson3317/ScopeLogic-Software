import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { CreateQuoteTemplateForm } from "../../components/quote-template/create-template-form";
import { PageHeader } from "../../components/page-header";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function QuoteTemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: templates } = await supabase
    .from("quote_templates")
    .select("id,name,description,trade_scope,default_material_markup,active,updated_at")
    .order("name");

  const templateIds = templates?.map((template) => template.id) ?? [];
  const { data: lines } = templateIds.length
    ? await supabase.from("quote_template_lines").select("id,quote_template_id").in("quote_template_id", templateIds)
    : { data: [] };
  const lineCounts = new Map<string, number>();
  for (const line of lines ?? []) lineCounts.set(line.quote_template_id, (lineCounts.get(line.quote_template_id) ?? 0) + 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Estimating"
        title="Quote Templates"
        description="Build reusable estimating baselines, then apply them to a quote without replacing existing estimator work."
        action="Back to Quotes"
        actionHref="/quotes"
      />

      <CreateQuoteTemplateForm />

      <section className="panel template-library-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Company Library</p>
            <h2>Saved Quote Templates</h2>
          </div>
          <span className="template-count">{templates?.length ?? 0} templates</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Template</th><th>Trade / System</th><th>Description</th><th className="numeric">Items</th><th>Status</th></tr></thead>
            <tbody>
              {templates?.map((template) => (
                <tr key={template.id}>
                  <td><Link className="table-link" href={`/quote-templates/${template.id}`}><strong>{template.name}</strong></Link></td>
                  <td>{template.trade_scope ?? "—"}</td>
                  <td className="template-description-cell">{template.description ?? "—"}</td>
                  <td className="numeric">{lineCounts.get(template.id) ?? 0}</td>
                  <td><span className="status status-neutral">{template.active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
              {!templates?.length ? <tr><td colSpan={5} className="table-empty">No Quote Templates yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
