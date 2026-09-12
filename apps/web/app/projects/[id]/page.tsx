import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { formatMoney } from "../../../lib/format";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, project_number, name, status, customer_id, bid_date, description")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [{ data: customer }, { data: quotes }] = await Promise.all([
    project.customer_id
      ? supabase.from("customers").select("id, name").eq("id", project.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id, quote_number, name, status, current_version_id")
      .eq("project_id", project.id)
      .neq("status", "archived")
      .order("created_at")
  ]);

  const versionIds = quotes?.map((quote) => quote.current_version_id).filter(Boolean) ?? [];
  const { data: versions } = versionIds.length
    ? await supabase
        .from("quote_versions")
        .select("id, display_version, final_sell_price")
        .in("id", versionIds)
    : { data: [] };

  const versionMap = new Map(
    versions?.map((version) => [
      version.id,
      {
        displayVersion: version.display_version,
        sell: Number(version.final_sell_price ?? 0)
      }
    ]) ?? []
  );

  const projectTotal =
    quotes?.reduce((sum, quote) => {
      const version = quote.current_version_id ? versionMap.get(quote.current_version_id) : null;
      return sum + (version?.sell ?? 0);
    }, 0) ?? 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Project ${project.project_number}`}
        title={project.name}
        description={`${customer?.name ?? "No customer"} · ${project.status.replaceAll("_", " ")}`}
        action="New Quote"
        actionHref={`/quotes/new?project=${project.id}`}
      />

      <section className="metric-grid project-metrics">
        <article className="metric-card">
          <span>Project Total</span>
          <strong>{formatMoney(projectTotal)}</strong>
          <p>Current versions of active quotes</p>
        </article>
        <article className="metric-card">
          <span>Quotes</span>
          <strong>{quotes?.length ?? 0}</strong>
          <p>Independent quote records</p>
        </article>
        <article className="metric-card">
          <span>Bid Date</span>
          <strong className="metric-date">
            {project.bid_date ? new Date(project.bid_date).toLocaleDateString("en-US") : "—"}
          </strong>
          <p>Project-level target date</p>
        </article>
        <article className="metric-card">
          <span>Status</span>
          <strong className="metric-date">{project.status.replaceAll("_", " ")}</strong>
          <p>Configurable company workflow later</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Estimating</p>
            <h2>Project Quotes</h2>
          </div>
          <Link className="text-button" href={`/quotes/new?project=${project.id}`}>Add Quote</Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote #</th>
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
                    <td className="mono">
                      <Link className="table-link" href={`/quotes/${quote.id}`}>{quote.quote_number}</Link>
                    </td>
                    <td>
                      <Link className="table-link" href={`/quotes/${quote.id}`}>
                        <strong>{quote.name}</strong>
                      </Link>
                    </td>
                    <td>{version?.displayVersion ?? "0.0"}</td>
                    <td><span className="status status-neutral">{quote.status.replaceAll("_", " ")}</span></td>
                    <td className="numeric"><strong>{formatMoney(version?.sell ?? 0)}</strong></td>
                  </tr>
                );
              })}
              {!quotes?.length ? (
                <tr>
                  <td colSpan={5} className="table-empty">No quotes yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
