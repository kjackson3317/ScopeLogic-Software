import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/page-header";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, status, created_at, updated_at")
    .order("name");

  return (
    <AppShell>
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description="Customer records can be used by Projects without requiring the rest of ScopeLogic CRM."
        action="New Customer"
        actionHref="/crm/customers/new"
      />

      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td><span className="status status-success">{customer.status}</span></td>
                  <td>{new Date(customer.created_at).toLocaleDateString("en-US")}</td>
                  <td>{new Date(customer.updated_at).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
              {!customers?.length ? (
                <tr>
                  <td colSpan={4} className="table-empty">No customers yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
