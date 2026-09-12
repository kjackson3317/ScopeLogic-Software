import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function ProposalProfilesPage() {
  const s=await createServerSupabaseClient();
  const [{data:profiles},{data:branding}]=await Promise.all([
    s.from("proposal_profiles").select("*").order("name"),
    s.from("organization_branding").select("*").limit(1).maybeSingle()
  ]);
  return <AppShell>
    <PageHeader eyebrow="Administration" title="Proposal Profiles" description="Estimate data and customer presentation remain independent."/>
    <div className="content-grid">
      <section className="panel"><div className="table-wrap"><table className="data-table">
        <thead><tr><th>Name</th><th>BOM</th><th>Qty</th><th>Unit Price</th><th>Labor</th></tr></thead>
        <tbody>{profiles?.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.show_bom?"Show":"Hide"}</td><td>{p.show_quantity?"Show":"Hide"}</td><td>{p.show_unit_sell?"Show":"Hide"}</td><td>{p.show_labor?"Show":"Hide"}</td></tr>)}</tbody>
      </table></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>{branding?.company_display_name??"Company Branding"}</h2></div></div>
        <div className="branding-summary"><div className="brand-swatch" style={{background:branding?.primary_color??"#4B6623"}}></div><div><strong>{branding?.primary_color??"#4B6623"}</strong><p>Primary proposal color</p></div></div>
      </section>
    </div>
  </AppShell>;
}
