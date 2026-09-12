import { AppShell } from "../components/app-shell";
import { MetricCard } from "../components/metric-card";
import { PageHeader } from "../components/page-header";
import { getAlphaAppContext } from "../lib/auth/app-context";
import { createServerSupabaseClient } from "../lib/supabase/server";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function HomePage() {
  const context = await getAlphaAppContext();

  let activeProjects = 0;
  let quoteCount = 0;
  let quoteSell = 0;
  let awaitingApproval = 0;

  if (context.state === "ready") {
    const supabase = await createServerSupabaseClient();

    const [{ count: projectCount }, { data: quotes }, { data: approvalQuotes }] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("complete","archived")'),
      supabase
        .from("quotes")
        .select("id, current_version_id"),
      supabase
        .from("quotes")
        .select("id")
        .eq("status", "internal_review")
    ]);

    activeProjects = projectCount ?? 0;
    quoteCount = quotes?.length ?? 0;
    awaitingApproval = approvalQuotes?.length ?? 0;

    const versionIds = quotes?.map((quote) => quote.current_version_id).filter(Boolean) ?? [];
    if (versionIds.length) {
      const { data: versions } = await supabase
        .from("quote_versions")
        .select("id, final_sell_price")
        .in("id", versionIds);

      quoteSell =
        versions?.reduce((sum, version) => sum + Number(version.final_sell_price ?? 0), 0) ?? 0;
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Alpha 1"
        title="Workspace"
        description="Your working view of projects, quotes, pricing, and approvals."
        action="New Project"
        actionHref="/projects/new"
      />

      <section className="metrics" aria-label="Workspace summary">
        <MetricCard label="Active Projects" value={String(activeProjects)} detail="Accessible to your account" />
        <MetricCard label="Quotes In Progress" value={String(quoteCount)} detail={`${money(quoteSell)} current sell`} />
        <MetricCard label="Awaiting Approval" value={String(awaitingApproval)} detail="Quotes in internal review" />
        <MetricCard label="Pricing Alerts" value="—" detail="Catalog pricing arrives in Batch 5" />
      </section>

      <div className="content-grid">
        <section className="panel empty-state compact-empty">
          <div className="empty-icon">PR</div>
          <h2>Start with a real project</h2>
          <p>Create a customer and project, then add independent quotes that roll into the project total.</p>
          <a className="primary-button link-button" href="/projects/new">Create Project</a>
        </section>

        <section className="panel empty-state compact-empty">
          <div className="empty-icon">QT</div>
          <h2>Create the first quote</h2>
          <p>Each quote receives its own number and an initial immutable version of 0.0.</p>
          <a className="secondary-button link-button" href="/quotes/new">Create Quote</a>
        </section>
      </div>
    </AppShell>
  );
}
