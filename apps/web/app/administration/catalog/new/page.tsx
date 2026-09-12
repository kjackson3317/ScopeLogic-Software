import { AppShell } from "../../../../components/app-shell";
import { PageHeader } from "../../../../components/page-header";
import { CatalogItemForm } from "../../../../components/forms/catalog-item-form";
export default function NewCatalogItemPage(){return <AppShell><PageHeader eyebrow="Catalog" title="New Item" description="Create the master item. Supplier and project pricing remain separate."/><CatalogItemForm/></AppShell>}
