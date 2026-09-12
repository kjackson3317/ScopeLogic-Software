import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { formatMoney } from "../../../lib/format";

export default async function LaborPage() {
  const supabase = await createServerSupabaseClient();
  const { data: schedules } = await supabase.from("labor_schedules").select("id,name,description,active").order("name");
  const { data: rates } = await supabase.from("labor_schedule_rates").select("schedule_id,labor_class_id,cost_rate,sell_rate");
  const { data: classes } = await supabase.from("labor_classes").select("id,name");
  const classMap = new Map((classes ?? []).map(c => [c.id, c.name]));
  return <AppShell>
    <PageHeader eyebrow="Administration" title="Labor Schedules"
      description="Regional, prevailing wage, union, service, and other labor schedules." />
    {(schedules ?? []).map(s => <section className="panel labor-schedule-panel" key={s.id}>
      <div className="panel-heading"><div><h2>{s.name}</h2><p className="page-description">{s.description ?? ""}</p></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Class</th><th className="numeric">Cost Rate</th><th className="numeric">Sell Rate</th></tr></thead>
      <tbody>{(rates ?? []).filter(r => r.schedule_id === s.id).map(r => <tr key={`${r.schedule_id}-${r.labor_class_id}`}>
        <td>{classMap.get(r.labor_class_id) ?? "Unknown"}</td><td className="numeric">{formatMoney(r.cost_rate)}</td><td className="numeric">{formatMoney(r.sell_rate)}</td>
      </tr>)}</tbody></table></div>
    </section>)}
  </AppShell>;
}
