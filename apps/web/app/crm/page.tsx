import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/page-header";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export default async function CrmPage() {
  const supabase = await createServerSupabaseClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, status, created_at")
    .order("name");

  return (
    <AppShell>
      <PageHeader
        eyebrow="CRM"
        title="Customers & Opportunities"
        description="Core CRM remains optional. Customers can be used directly by Projects even if the company later connects an external CRM."
        action="New Customer"
        actionHref="/crm/customers/new"
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Customers</p>
            <h2>{customers?.length ?? 0} company records</h2>
          </div>
          <Link className="text-button" href="/crm/customers">View customers</Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customers?.slice(0, 8).map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td><span className="status status-success">{customer.status}</span></td>
                  <td>{new Date(customer.created_at).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
              {!customers?.length ? (
                <tr>
                  <td colSpan={3} className="table-empty">No customers yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
