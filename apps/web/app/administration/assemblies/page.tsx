import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function AssembliesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: assemblies } = await supabase.from("assemblies").select("id,name,category,status,version").order("name");
  return <AppShell>
    <PageHeader eyebrow="Administration" title="Assemblies" description="Reusable combinations of material, labor, equipment, and formulas." />
    <section className="panel"><div className="table-wrap"><table className="data-table">
      <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Version</th></tr></thead>
      <tbody>{assemblies?.map(a => <tr key={a.id}><td><strong>{a.name}</strong></td><td>{a.category ?? "—"}</td><td>{a.status}</td><td>{a.version}</td></tr>)}
      {!assemblies?.length ? <tr><td colSpan={4} className="table-empty">No assemblies yet.</td></tr> : null}</tbody>
    </table></div></section>
  </AppShell>;
}
