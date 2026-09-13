import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { QuoteTemplateEditor } from "../../../components/quote-template/quote-template-editor";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function QuoteTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: template } = await supabase
    .from("quote_templates")
    .select("id,name,description,trade_scope,default_material_markup,active")
    .eq("id", id)
    .maybeSingle();

  if (!template) notFound();

  const [{ data: sections }, { data: lines }, { data: quotes }] = await Promise.all([
    supabase.from("quote_template_sections").select("id,name,sort_order").eq("quote_template_id", id).order("sort_order"),
    supabase.from("quote_template_lines").select("id,section_id,line_type,catalog_item_id,manufacturer,part_number,description,uom,quantity,unit_material_cost,labor_hours_per_unit,labor_rate,unit_other_cost,unit_sell,show_on_bom,sort_order").eq("quote_template_id", id).order("sort_order"),
    supabase.from("quotes").select("id,quote_number,name,project_id,current_version_id,status").neq("status", "archived").order("quote_number")
  ]);

  const projectIds = Array.from(new Set(quotes?.map((quote) => quote.project_id) ?? []));
  const versionIds = quotes?.map((quote) => quote.current_version_id).filter(Boolean) ?? [];
  const [{ data: projects }, { data: versions }] = await Promise.all([
    projectIds.length ? supabase.from("projects").select("id,project_number,name").in("id", projectIds) : Promise.resolve({ data: [] }),
    versionIds.length ? supabase.from("quote_versions").select("id,status").in("id", versionIds) : Promise.resolve({ data: [] })
  ]);
  const projectMap = new Map(projects?.map((project) => [project.id, `${project.project_number} · ${project.name}`]) ?? []);
  const draftVersionIds = new Set(versions?.filter((version) => version.status === "draft").map((version) => version.id) ?? []);
  const quoteOptions = (quotes ?? [])
    .filter((quote) => Boolean(quote.current_version_id) && draftVersionIds.has(quote.current_version_id))
    .map((quote) => ({ id: quote.id, label: `${projectMap.get(quote.project_id) ?? "Project"} · ${quote.quote_number} · ${quote.name}` }));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Quote Templates"
        title={template.name}
        description="Build a reusable estimating baseline using catalog or ad-hoc items, then apply it to a draft quote without replacing existing work."
        action="Template Library"
        actionHref="/quote-templates"
      />
      <QuoteTemplateEditor
        template={{ ...template, default_material_markup: Number(template.default_material_markup ?? 1.2) }}
        sections={(sections ?? []).map((section) => ({ ...section, sort_order: Number(section.sort_order) }))}
        lines={(lines ?? []).map((line) => ({
          ...line,
          quantity: Number(line.quantity),
          unit_material_cost: Number(line.unit_material_cost),
          labor_hours_per_unit: Number(line.labor_hours_per_unit),
          labor_rate: Number(line.labor_rate),
          unit_other_cost: Number(line.unit_other_cost),
          unit_sell: Number(line.unit_sell)
        }))}
        quoteOptions={quoteOptions}
      />
    </AppShell>
  );
}
