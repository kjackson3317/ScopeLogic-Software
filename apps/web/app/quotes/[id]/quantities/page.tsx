import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { QuantityInputForm } from "../../../../components/quote/quantity-input-form";
import { RunRulesButton } from "../../../../components/quote/run-rules-button";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { RuleResultActions } from "../../../../components/quote/rule-result-actions";

export default async function QuoteQuantitiesPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const s=await createServerSupabaseClient();
  const {data:q}=await s.from("quotes").select("id,quote_number,name,current_version_id").eq("id",id).maybeSingle();
  if(!q||!q.current_version_id) notFound();
  const [{data:inputs},{data:results},{data:sections}] = await Promise.all([
    s.from("quantity_inputs").select("id,input_key,label,value,unit,source_type").eq("quote_version_id",q.current_version_id).order("input_key"),
    s.from("rule_results").select("id,output_label,output_value,output_unit,behavior,status").eq("quote_version_id",q.current_version_id).order("created_at",{ascending:false}),
    s.from("estimate_sections").select("id,name").eq("quote_version_id",q.current_version_id).order("sort_order")
  ]);

  return <AppShell>
    <div className="quote-workspace-header"><div><p className="section-kicker">Rules Inputs</p><h1>{q.quote_number} · {q.name}</h1></div><RunRulesButton quoteId={q.id}/></div>
    <QuoteTabs quoteId={q.id} active="quantities"/>
    <section className="panel">
      <div className="panel-heading"><div><h2>Quantity Inputs</h2><p className="page-description">Manual, imported, and future Takeoff quantities feed the same Rules Engine.</p></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Key</th><th>Label</th><th className="numeric">Value</th><th>Unit</th><th>Source</th></tr></thead>
      <tbody>{inputs?.map(i=><tr key={i.id}><td className="mono">{i.input_key}</td><td>{i.label}</td><td className="numeric">{Number(i.value).toLocaleString()}</td><td>{i.unit}</td><td>{i.source_type}</td></tr>)}
      {!inputs?.length?<tr><td colSpan={5} className="table-empty">No quantity inputs yet.</td></tr>:null}</tbody></table></div>
      <QuantityInputForm quoteId={q.id}/>
    </section>
    <section className="panel rules-results-panel">
      <div className="panel-heading"><div><h2>Calculated Results</h2><p className="page-description">Recommendations remain reviewable; nothing is silently committed to the BOM.</p></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Result</th><th className="numeric">Value</th><th>Unit</th><th>Behavior</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{results?.map(r=><tr key={r.id}><td><strong>{r.output_label}</strong></td><td className="numeric">{Number(r.output_value).toLocaleString()}</td><td>{r.output_unit}</td><td>{r.behavior}</td><td>{r.status}</td><td><RuleResultActions quoteId={q.id} resultId={r.id} behavior={r.behavior} status={r.status} sections={sections??[]}/></td></tr>)}
      {!results?.length?<tr><td colSpan={6} className="table-empty">Run Rules to calculate results.</td></tr>:null}</tbody></table></div>
    </section>
  </AppShell>;
}
