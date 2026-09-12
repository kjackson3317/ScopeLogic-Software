import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { getAlphaAppContext } from "../../lib/auth/app-context";
import { getSupabaseConfig } from "../../lib/supabase/config";

export default async function DiagnosticsPage() {
  const context=await getAlphaAppContext();
  const config=getSupabaseConfig();
  const ready=context.state==="ready";

  return <AppShell>
    <PageHeader eyebrow="Alpha" title="Diagnostics"
      description="Basic environment context for Alpha testing and future support."/>
    <section className="panel diagnostics-grid">
      <div><span>Environment</span><strong>{process.env.NEXT_PUBLIC_APP_ENV??"unknown"}</strong></div>
      <div><span>Supabase Configured</span><strong>{config.configured?"Yes":"No"}</strong></div>
      <div><span>Context State</span><strong>{context.state}</strong></div>
      <div><span>Organization</span><strong>{ready?context.organizationName:"—"}</strong></div>
      <div><span>Role</span><strong>{ready?context.roleName:"—"}</strong></div>
      <div><span>Access Scope</span><strong>{ready?context.accessScope:"—"}</strong></div>
      <div><span>Enabled Modules</span><strong>{ready?context.enabledModules.join(", "):"—"}</strong></div>
    </section>
  </AppShell>;
}
