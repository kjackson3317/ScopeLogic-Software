import { AppShell } from "../../../components/app-shell";
import { QuoteForm } from "../../../components/forms/quote-form";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function NewQuotePage({
  searchParams
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_number, name")
    .neq("status", "archived")
    .order("project_number");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Quotes"
        title="New Quote"
        description="Every quote belongs to a project, keeps its own quote number, and rolls into the project total."
      />
      <QuoteForm projects={projects ?? []} defaultProjectId={project} />
    </AppShell>
  );
}
