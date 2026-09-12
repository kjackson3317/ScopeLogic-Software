# ScopeLogic Software — Batch 4

Batch 4 adds the first real estimating workspace.

## Adds

- live Quote detail/workspace
- Estimate / Scope / Alternates / Proposal / History tabs
- structured estimate sections
- structured estimate lines
- material / labor / other cost separation
- calculated extended sell, gross profit, and margin
- quantity-source contribution records
- current Quote Version totals recalculated from estimate lines
- manual estimate-line entry
- editable draft line quantities/pricing
- version finalization
- regular revisions (`0.0 → 0.1 → 0.2`)
- change-order revisions (`0.x → 1.0`, `1.x → 2.0`)
- automatic copying of estimate sections, lines, and quantity-source traceability into a new revision
- read-only historical Quote Versions
- Quote History screen
- first pricing-source fields in estimate lines, ready for Batch 5 Catalog/Pricing integration

## Important design behavior

Historical Quote Versions are immutable.

A Quote Version can be edited while it is `draft`. Once finalized/archived/submitted/awarded, its estimate records cannot be modified through the Batch 4 database RPCs.

Creating a revision copies the prior version into a new editable version. The old version remains preserved.

## Upload

Extract the ZIP and upload the **contents** to the root of `ScopeLogic-Software`.

Existing files intentionally replaced:

- `apps/web/app/quotes/page.tsx`
- `apps/web/app/projects/[id]/page.tsx`
- `apps/web/app/globals-batch-3.css`
- `apps/web/app/layout.tsx`
- `supabase/migrations/0002_live_project_quote_flow.sql` is NOT replaced

## Database

After migrations `0001` and `0002` are applied to the isolated Alpha database, apply:

`supabase/migrations/0003_quote_workspace.sql`

## Test flow after migration

1. Open an existing project.
2. Create a quote.
3. Open the quote from the Project or Quotes screen.
4. Add estimate sections if desired.
5. Add manual estimate lines.
6. Confirm Material / Labor / Other / Total Cost / Sell / Margin recalculate.
7. Finalize version `0.0`.
8. Create a regular revision and confirm version `0.1`.
9. Verify `0.0` remains readable but unchanged.
10. Create a change-order revision later and confirm the next major number is used.

## Batch 5

Batch 5 will add the central estimating catalog:

- Item Catalog
- item types
- manufacturers
- vendor/supplier price records
- company pricing policies
- project pricing
- labor classes and labor schedules
- assemblies
- selecting catalog items into a quote
- price-source visibility and quote pricing snapshots
