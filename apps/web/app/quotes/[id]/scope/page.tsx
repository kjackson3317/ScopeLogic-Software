import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { QuoteTabs } from "../../../../components/quote/quote-tabs";
import { ScopeEditor } from "../../../../components/quote/scope-editor";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export default async function QuoteScopePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const s=await createServerSupabaseClient();
  const {data:q}=await s.from("quotes").select("id,quote_number,name,current_version_id").eq("id",id).maybeSingle();
  if(!q||!q.current_version_id) notFound();
  const {data:scope}=await s.from("quote_scope_content").select("*").eq("quote_version_id",q.current_version_id).maybeSingle();

  return <AppShell>
    <div className="quote-workspace-header"><div><p className="section-kicker">Quote Scope</p><h1>{q.quote_number} · {q.name}</h1></div></div>
    <QuoteTabs quoteId={q.id} active="scope"/>
    <section className="panel">
      <ScopeEditor quoteId={q.id} initial={{
        scope:scope?.scope_text??"",inclusions:scope?.inclusions??"",exclusions:scope?.exclusions??"",
        assumptions:scope?.assumptions??"",clarifications:scope?.clarifications??""
      }}/>
    </section>
  </AppShell>;
}
