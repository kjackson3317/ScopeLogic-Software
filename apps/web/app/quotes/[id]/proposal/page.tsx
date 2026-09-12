import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { PrintProposalButton } from "../../../../components/proposal/print-button";
import { formatMoney } from "../../../../lib/format";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteProposalPage({
  params,searchParams
}:{params:Promise<{id:string}>;searchParams:Promise<{profile?:string}>}) {
  const {id}=await params;const {profile}=await searchParams;const s=await createServerSupabaseClient();
  const {data:q}=await s.from("quotes").select("id,quote_number,name,project_id,current_version_id").eq("id",id).maybeSingle();
  if(!q||!q.current_version_id) notFound();

  const [{data:project},{data:version},{data:lines},{data:profiles},{data:scope},{data:branding}]=await Promise.all([
    s.from("projects").select("project_number,name,customer_id").eq("id",q.project_id).single(),
    s.from("quote_versions").select("*").eq("id",q.current_version_id).single(),
    s.from("estimate_lines").select("*").eq("quote_version_id",q.current_version_id).order("sort_order"),
    s.from("proposal_profiles").select("*").order("name"),
    s.from("quote_scope_content").select("*").eq("quote_version_id",q.current_version_id).maybeSingle(),
    s.from("organization_branding").select("*").limit(1).maybeSingle()
  ]);
  const selected=(profiles??[]).find(p=>p.id===profile)??profiles?.[0];

  return <AppShell>
    <div className="quote-workspace-header">
      <div><p className="section-kicker">Proposal Preview</p><h1>{q.quote_number} · {q.name}</h1></div>
      <PrintProposalButton/>
    </div>
    <QuoteTabs quoteId={q.id} active="proposal"/>
    <section className="proposal-toolbar">
      {(profiles??[]).map(p=><a className={`secondary-button link-button ${selected?.id===p.id?"selected-profile":""}`} href={`/quotes/${q.id}/proposal?profile=${p.id}`} key={p.id}>{p.name}</a>)}
    </section>
    <article className="proposal-preview" style={{"--proposal-primary":branding?.primary_color??"#4B6623"} as React.CSSProperties}>
      <header className="proposal-header">
        <div><h2>{branding?.company_display_name??"ScopeLogic Alpha Company"}</h2><p>{branding?.address_text??""}</p></div>
        <div className="proposal-title"><strong>PROPOSAL</strong><span>{q.quote_number}</span></div>
      </header>
      <section className="proposal-project"><h1>{project?.name}</h1><p>{project?.project_number} · {q.name} · Version {version?.display_version}</p></section>
      {scope?.scope_text?<section><h3>Scope of Work</h3><p className="preserve-whitespace">{scope.scope_text}</p></section>:null}
      {selected?.show_bom?<section>
        <h3>Estimate Summary</h3>
        <table className="proposal-table"><thead><tr><th>Description</th>{selected.show_quantity?<th>Qty</th>:null}{selected.show_unit_sell?<th>Unit Price</th>:null}<th>Total</th></tr></thead>
        <tbody>{(lines??[]).map(l=><tr key={l.id}>
          <td>{selected.show_manufacturer&&l.manufacturer?`${l.manufacturer} `:""}{selected.show_part_number&&l.part_number?`${l.part_number} `:""}{l.description}</td>
          {selected.show_quantity?<td>{Number(l.quantity).toLocaleString()} {l.uom}</td>:null}
          {selected.show_unit_sell?<td>{formatMoney(l.unit_sell)}</td>:null}
          <td>{formatMoney(l.extended_sell)}</td>
        </tr>)}</tbody></table>
      </section>:null}
      <section className="proposal-total"><span>Proposal Total</span><strong>{formatMoney(version?.final_sell_price)}</strong></section>
      {scope?.exclusions?<section><h3>Exclusions</h3><p className="preserve-whitespace">{scope.exclusions}</p></section>:null}
      {scope?.assumptions?<section><h3>Assumptions</h3><p className="preserve-whitespace">{scope.assumptions}</p></section>:null}
      {scope?.clarifications?<section><h3>Clarifications</h3><p className="preserve-whitespace">{scope.clarifications}</p></section>:null}
      {branding?.terms_text?<section><h3>Terms</h3><p className="preserve-whitespace">{branding.terms_text}</p></section>:null}
    </article>
  </AppShell>;
}
