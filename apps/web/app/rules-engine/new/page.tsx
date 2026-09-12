import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { RuleForm } from "../../../components/forms/rule-form";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function NewRulePage() {
  const supabase = await createServerSupabaseClient();
  const { data: items } = await supabase.from("catalog_items").select("id,description,part_number").eq("active",true).order("description");
  return <AppShell>
    <PageHeader eyebrow="Rules Engine" title="New Rule" description="Alpha uses deterministic controlled formulas rather than arbitrary code." />
    <RuleForm catalogItems={items ?? []} />
  </AppShell>;
}
