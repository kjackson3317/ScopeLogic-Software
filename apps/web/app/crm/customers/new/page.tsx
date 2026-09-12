import { AppShell } from "../../../../components/app-shell";
import { CustomerForm } from "../../../../components/forms/customer-form";
import { PageHeader } from "../../../../components/page-header";

export default function NewCustomerPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="CRM"
        title="New Customer"
        description="Create the customer record that Projects and Quotes can reference."
      />
      <CustomerForm />
    </AppShell>
  );
}
