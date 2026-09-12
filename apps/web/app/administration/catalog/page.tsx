import Link from "next/link";
import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { formatMoney } from "../../../lib/format";

export default async function CatalogPage() {
  const supabase = await createServerSupabaseClient();
  const { data: items } = await supabase
    .from("catalog_items")
    .select("id,item_type,manufacturer,part_number,description,category,uom,approved_cost,active")
    .order("description");

  return (
    <AppShell>
      <PageHeader eyebrow="Administration" title="Item Catalog"
        description="Central company item records with independent supplier and project pricing." action="New Item" actionHref="/administration/catalog/new" />
      <section className="panel">
        <div className="toolbar">
          <div className="toolbar-actions">
            <Link className="secondary-button link-button" href="/administration/suppliers">Suppliers</Link>
            <Link className="secondary-button link-button" href="/administration/labor">Labor</Link>
            <Link className="secondary-button link-button" href="/administration/assemblies">Assemblies</Link>
          </div>
        </div>
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Type</th><th>Manufacturer</th><th>Part #</th><th>Description</th><th>Category</th><th>UOM</th><th className="numeric">Approved Cost</th><th>Status</th></tr></thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id}>
                <td>{item.item_type}</td><td>{item.manufacturer ?? "—"}</td><td className="mono">{item.part_number ?? "—"}</td>
                <td><strong>{item.description}</strong></td><td>{item.category ?? "—"}</td><td>{item.uom}</td>
                <td className="numeric">{formatMoney(item.approved_cost)}</td>
                <td><span className="status status-neutral">{item.active ? "Active" : "Inactive"}</span></td>
              </tr>
            ))}
            {!items?.length ? <tr><td colSpan={8} className="table-empty">No catalog items yet.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
    </AppShell>
  );
}
