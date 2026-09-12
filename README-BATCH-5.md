# ScopeLogic Software — Batch 5

Batch 5 adds the central estimating catalog, supplier pricing, project pricing, labor schedules, and assemblies.

## Adds

- Item Catalog
- generic item types
- suppliers/vendors
- multiple supplier prices per item
- company pricing policies
- project-specific pricing
- labor classes
- labor schedules and schedule rates
- assemblies and assembly components
- catalog administration screens
- catalog item detail / price visibility
- project pricing stored separately from master catalog cost

## Upload

Extract the ZIP and upload its contents to the root of `ScopeLogic-Software`.

## Database

After migrations 0001–0003 are applied to the isolated Alpha database, apply:

`supabase/migrations/0004_catalog_pricing_labor.sql`

## Alpha write paths
This revision also includes simple create forms for Catalog Items and Suppliers so the catalog can be populated without direct SQL.
