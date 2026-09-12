import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { PageHeader } from "../../../../components/page-header";
import { DocumentUploadForm } from "../../../../components/documents/upload-form";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function ProjectDocumentsPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const s=await createServerSupabaseClient();
  const [{data:project},{data:folders},{data:docs}]=await Promise.all([
    s.from("projects").select("id,project_number,name").eq("id",id).maybeSingle(),
    s.from("document_folders").select("id,name,parent_folder_id,sort_order").eq("project_id",id).order("sort_order"),
    s.from("documents").select("id,name,folder_id,document_kind,controlled,status").eq("project_id",id).order("updated_at",{ascending:false})
  ]);
  if(!project) notFound();
  const fmap=new Map((folders??[]).map(f=>[f.id,f.name]));
  return <AppShell>
    <PageHeader eyebrow={`Project ${project.project_number}`} title="Documents" description={project.name}/>
    <div className="document-layout">
      <aside className="folder-panel"><p className="section-kicker">Project Folders</p><h2>{project.name}</h2>
        <nav className="folder-tree">{(folders??[]).map(f=><button className="folder" key={f.id} type="button">{f.name}</button>)}</nav>
      </aside>
      <section className="panel document-main">
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Name</th><th>Folder</th><th>Kind</th><th>Controlled</th><th>Status</th></tr></thead>
          <tbody>{(docs??[]).map(d=><tr key={d.id}><td><strong>{d.name}</strong></td><td>{fmap.get(d.folder_id)??"—"}</td><td>{d.document_kind}</td><td>{d.controlled?"Yes":"No"}</td><td>{d.status}</td></tr>)}
          {!docs?.length?<tr><td colSpan={5} className="table-empty">No documents yet.</td></tr>:null}</tbody>
        </table></div>
        <DocumentUploadForm projectId={id} folders={(folders??[]).map(f=>({id:f.id,name:f.name}))}/>
      </section>
    </div>
  </AppShell>;
}
