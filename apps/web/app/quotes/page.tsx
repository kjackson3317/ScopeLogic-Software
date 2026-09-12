import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { createServerSupabaseClient } from "../../lib/supabase/server";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function QuotesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, name, project_id, status, current_version_id, created_at")
    .order("updated_at", { ascending: false });

  const projectIds = Array.from(new Set(quotes?.map((quote) => quote.project_id) ?? []));
  const versionIds = quotes?.map((quote) => quote.current_version_id).filter(Boolean) ?? [];

  const [{ data: projects }, { data: versions }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, project_number, name").in("id", projectIds)
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? supabase.from("quote_versions").select("id, display_version, final_sell_price").in("id", versionIds)
      : Promise.resolve({ data: [] })
  ]);

  const projectMap = new Map(
    projects?.map((project) => [project.id, `${project.project_number} · ${project.name}`]) ?? []
  );
  const versionMap = new Map(
    versions?.map((version) => [
      version.id,
      { displayVersion: version.display_version, sell: Number(version.final_sell_price ?? 0) }
    ]) ?? []
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Estimating"
        title="Quotes"
        description="Manage independent estimates across all accessible projects."
        action="New Quote"
        actionHref="/quotes/new"
      />

      <section className="panel">
        <div className="toolbar">
          <input className="search-input" aria-label="Search quotes" placeholder="Search quotes..." />
          <div className="toolbar-actions">
            <button className="secondary-button" type="button">Mine</button>
            <button className="secondary-button" type="button">Filters</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Project</th>
                <th>Quote</th>
                <th>Version</th>
                <th>Status</th>
                <th className="numeric">Sell</th>
              </tr>
            </thead>
            <tbody>
              {quotes?.map((quote) => {
                const version = quote.current_version_id ? versionMap.get(quote.current_version_id) : null;

                return (
                  <tr key={quote.id}>
                    <td className="mono">{quote.quote_number}</td>
                    <td>{projectMap.get(quote.project_id) ?? "—"}</td>
                    <td><strong>{quote.name}</strong></td>
                    <td>{version?.displayVersion ?? "0.0"}</td>
                    <td><span className="status status-neutral">{quote.status.replaceAll("_", " ")}</span></td>
                    <td className="numeric"><strong>{money(version?.sell ?? 0)}</strong></td>
                  </tr>
                );
              })}
              {!quotes?.length ? (
                <tr>
                  <td colSpan={6} className="table-empty">No quotes yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
