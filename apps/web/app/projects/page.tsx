import Link from "next/link";
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

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_number, name, status, customer_id, bid_date")
    .order("updated_at", { ascending: false });

  const customerIds = Array.from(new Set(projects?.map((project) => project.customer_id).filter(Boolean) ?? []));
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, name").in("id", customerIds)
    : { data: [] };

  const customerMap = new Map(customers?.map((customer) => [customer.id, customer.name]) ?? []);

  const projectIds = projects?.map((project) => project.id) ?? [];
  const { data: quotes } = projectIds.length
    ? await supabase
        .from("quotes")
        .select("id, project_id, current_version_id, status")
        .in("project_id", projectIds)
        .neq("status", "archived")
    : { data: [] };

  const versionIds = quotes?.map((quote) => quote.current_version_id).filter(Boolean) ?? [];
  const { data: versions } = versionIds.length
    ? await supabase
        .from("quote_versions")
        .select("id, final_sell_price")
        .in("id", versionIds)
    : { data: [] };

  const versionMap = new Map(versions?.map((version) => [version.id, Number(version.final_sell_price ?? 0)]) ?? []);

  const projectRollups = new Map<string, { count: number; total: number }>();
  quotes?.forEach((quote) => {
    const current = projectRollups.get(quote.project_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += quote.current_version_id ? (versionMap.get(quote.current_version_id) ?? 0) : 0;
    projectRollups.set(quote.project_id, current);
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Projects"
        title="Projects"
        description="Projects are the parent container for documents, independent quotes, takeoffs, and future preconstruction workflows."
        action="New Project"
        actionHref="/projects/new"
      />

      <section className="panel">
        <div className="toolbar">
          <input className="search-input" aria-label="Search projects" placeholder="Search projects..." />
          <div className="toolbar-actions">
            <button className="secondary-button" type="button">My Projects</button>
            <button className="secondary-button" type="button">Filters</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project #</th>
                <th>Project</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Quotes</th>
                <th>Bid Date</th>
                <th className="numeric">Project Total</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map((project) => {
                const rollup = projectRollups.get(project.id) ?? { count: 0, total: 0 };

                return (
                  <tr key={project.id}>
                    <td className="mono">{project.project_number}</td>
                    <td>
                      <Link className="table-link" href={`/projects/${project.id}`}>
                        <strong>{project.name}</strong>
                      </Link>
                    </td>
                    <td>{project.customer_id ? customerMap.get(project.customer_id) ?? "—" : "—"}</td>
                    <td><span className="status status-neutral">{project.status.replaceAll("_", " ")}</span></td>
                    <td>{rollup.count}</td>
                    <td>{project.bid_date ? new Date(project.bid_date).toLocaleDateString("en-US") : "—"}</td>
                    <td className="numeric"><strong>{money(rollup.total)}</strong></td>
                  </tr>
                );
              })}
              {!projects?.length ? (
                <tr>
                  <td colSpan={7} className="table-empty">No projects yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
