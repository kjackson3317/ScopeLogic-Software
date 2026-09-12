import { AppShell } from "../../../components/app-shell";
import { ProjectForm } from "../../../components/forms/project-form";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function NewProjectPage() {
  const supabase = await createServerSupabaseClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Projects"
        title="New Project"
        description="Keep project creation short. Additional detail can be added after the project exists."
      />
      <ProjectForm customers={customers ?? []} />
    </AppShell>
  );
}
