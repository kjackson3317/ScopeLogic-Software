import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { SupplierForm } from "../../../components/forms/supplier-form";

export default async function SuppliersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id,name,code,active").order("name");
  return <AppShell>
    <PageHeader eyebrow="Administration" title="Suppliers" description="Suppliers/vendors are distinct from manufacturers." />
    <section className="panel"><div className="table-wrap"><table className="data-table">
      <thead><tr><th>Name</th><th>Code</th><th>Status</th></tr></thead>
      <tbody>{suppliers?.map(s=><tr key={s.id}><td><strong>{s.name}</strong></td><td className="mono">{s.code ?? "—"}</td><td>{s.active ? "Active" : "Inactive"}</td></tr>)}
      {!suppliers?.length ? <tr><td colSpan={3} className="table-empty">No suppliers yet.</td></tr> : null}</tbody>
    </table></div><SupplierForm/></section>
  </AppShell>;
}
