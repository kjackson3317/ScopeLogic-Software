import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function RulesEnginePage() {
  const supabase = await createServerSupabaseClient();
  const { data: rules } = await supabase
    .from("rules")
    .select("id,name,category,status,current_version_id")
    .order("name");

  return <AppShell>
    <PageHeader eyebrow="Automation" title="ScopeLogic Rules Engine"
      description="Rules calculate requirements from quantities. They do not silently edit the BOM."
      action="New Rule" actionHref="/rules-engine/new" />
    <section className="panel">
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Rule</th><th>Category</th><th>Status</th></tr></thead>
        <tbody>
          {rules?.map(r => <tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.category ?? "—"}</td><td>{r.status}</td></tr>)}
          {!rules?.length ? <tr><td colSpan={3} className="table-empty">No rules yet.</td></tr> : null}
        </tbody>
      </table></div>
    </section>
  </AppShell>;
}
