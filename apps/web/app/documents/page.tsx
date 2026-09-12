import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function DocumentsPage() {
  const s=await createServerSupabaseClient();
  const {data:docs}=await s.from("documents")
    .select("id,name,document_kind,controlled,status,project_id")
    .order("updated_at",{ascending:false});
  const ids=Array.from(new Set((docs??[]).map(d=>d.project_id)));
  const {data:projects}=ids.length
    ? await s.from("projects").select("id,project_number,name").in("id",ids)
    : {data:[]};
  const pmap=new Map((projects??[]).map(p=>[p.id,`${p.project_number} · ${p.name}`]));

  return <AppShell>
    <PageHeader eyebrow="Documents" title="Document Portal"
      description="Global access to project files and controlled document sets."/>
    <section className="panel">
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Name</th><th>Project</th><th>Kind</th><th>Controlled</th><th>Status</th></tr></thead>
        <tbody>
          {docs?.map(d=><tr key={d.id}>
            <td><strong>{d.name}</strong></td><td>{pmap.get(d.project_id)??"—"}</td>
            <td>{d.document_kind}</td><td>{d.controlled?"Yes":"No"}</td><td>{d.status}</td>
          </tr>)}
          {!docs?.length?<tr><td colSpan={5} className="table-empty">No documents yet.</td></tr>:null}
        </tbody>
      </table></div>
    </section>
  </AppShell>;
}
