# ScopeLogic Software — Live Quote Builder Parity Baseline

**Status:** Active implementation baseline

**Purpose:** The commercial ScopeLogic Software Quote Builder must first reach practical parity with the existing live ScopeLogic Quote Builder before workflow redesign. The live product is the reference implementation for estimator-facing behavior. The commercial application keeps the new multi-tenant/RLS/versioning architecture underneath and does not copy legacy implementation debt.

## Governing rule

- Preserve useful live Quote Builder behavior, layout concepts, and estimator workflows unless there is a specific architectural, security, scalability, usability, or commercial-product reason to change them.
- Parity first; improvements second.
- Do not replace familiar estimator workflows merely because the commercial application is a new codebase.
- Do not use browser-native `alert`, `confirm`, or `prompt`. Recreate equivalent flows with in-application dialogs.
- Do not silently overwrite pricing, quantities, scope, or BOM data.

## Numbering note

The revision/change-order progression is already defined, but the base Project Number and Quote Number formats are not yet approved. Until a company-configurable numbering standard is selected, existing Alpha manual-entry numbering remains temporary. See `NUMBERING-DECISIONS.md`.

## Live Quote Builder capability baseline

### Quote identity and lifecycle

- Multiple independent quotes per project.
- Quote number, quote name, status, and project association.
- Base quote and change-order relationships.
- Latest/current revision remains identifiable while prior revisions remain immutable.
- Project rollup includes the current revision of each included quote document.
- Per-quote inclusion/exclusion from project total.
- Awarded quote can create linked change orders.

### Revision workflow

- Issued/locked revision remains immutable.
- Create editable revision from the prior locked revision.
- Capture revision reason.
- Optionally refresh pricing during revision creation.
- Material and labor refresh can be selected independently.
- Quote-specific price overrides can be preserved instead of silently replaced.
- Pricing refresh records previous/current totals and item-level decisions.

### BOM / estimate grid

- Dense estimator-style working grid.
- Database-linked material lines.
- Ad-hoc material lines.
- Manufacturer, part number, description, quantity, unit cost, markup, labor, and extended values.
- Quote-specific cost overrides.
- Quote-specific markup overrides.
- Keep-zero rows when intentionally retained.
- Base estimate and alternate BOMs.
- Search/filter catalog before adding database items.
- Add parts directly from the item database.
- Add ad-hoc items directly from the quote workspace.

### BOM organization

- User-defined groups/headers.
- Rename and remove groups.
- Reorder groups.
- Drag/reassign lines between groups.
- Ungrouped working area.
- Group order carries through to customer-facing BOM/proposal output.

### Quantity-source integrity

- Track manual, template, and takeoff quantity contributions separately.
- Recalculation of one source does not destroy contributions from other sources.
- Takeoff recalculation updates only takeoff-generated contribution.
- Template application adds template contribution without silently erasing manual work.

### Quote Templates

- Workspace/company reusable quote templates.
- Template name, description, system/trade, markup defaults, labor defaults, groups, and lines.
- Add catalog items to templates.
- Add ad-hoc items to templates.
- Organize template lines with the same group/header concept used by quotes.
- Save, edit, duplicate, and delete templates.
- Apply a template to a quote.
- Reconcile template groups into quote groups by name rather than duplicating equivalent headers.
- Applying a template preserves existing quote data.

### Alternates

- Add alternates.
- Separate alternate BOM rows.
- Edit alternate name and scope.
- Add/deduct classification based on value.
- Award selected alternates.
- Awarded alternates flow into purchasing/project value where applicable.

### Breakouts

- Create named breakouts.
- Allocate quote quantities to breakouts.
- Bulk percentage allocation.
- Copy an allocation pattern to selected rows.
- Reorder breakouts.
- Control proposal visibility.
- Identify unassigned breakout quantities.

### Labor and difficulty

- Multiple labor classes/rates.
- Per-class labor markup.
- Project/quote difficulty multiplier.
- Project Management labor separated from field labor.
- Engineering can be marked not required.
- Miscellaneous labor.
- Material handling labor.
- Overtime labor.
- Travel hours and travel expense calculation.
- Historical labor-rate snapshot retained with issued revision.

### Other estimating costs

- Material cost and sell.
- Miscellaneous material percentage/markup.
- Shipping percentage/amount/markup.
- Other costs/markup.
- Lift, parking, connex/storage, permit, and related markups.
- Tax.
- Bond.
- Job material discount.
- Commission percentage or custom amount.
- Gross profit/margin and net profit/margin visibility where permitted.

### Purchasing BOM

- Consolidated purchasing view of database-linked material.
- Current base quote plus awarded alternates where applicable.
- Grouped purchasing sections.
- User selection of BOM rows for proposal/output where applicable.

### Scope / commercial language

- Included scope.
- Excluded scope.
- Quote-specific terms/commercial language.
- Internal notes.
- Administrative notes.
- Scope snapshot retained with issued revision.

### Proposal / issue controls

- Preview before official issue.
- Preview does not create an immutable release or lock the quote.
- Official proposal generation requires appropriate status/permission.
- Official issue archives an immutable snapshot and locks that revision.
- Individual quote proposal.
- Combined project proposal across selected independent quotes.
- BOM/no-BOM output options.
- Pricing-detail visibility controls.

### Item Catalog / pricing support

- Search by manufacturer, part number, and description.
- Add/edit active catalog items.
- Spreadsheet import.
- Full-record add/update mode.
- Pricing-only update mode.
- Import preview showing New / Update / Skipped / Error before applying.
- Download current database and blank import template.
- Vendor/pricing architecture in the commercial product remains separate from item identity.

## Commercial implementation rules

- Use normalized relational tables for reusable templates and estimate structure; do not store the entire quote/template as one opaque JSON blob.
- Every reusable company object carries `organization_id` and is protected by RLS.
- API/RPC permission checks remain authoritative; UI hiding is not security.
- Historical quote revisions remain immutable.
- Reusable templates are not historical quote revisions and may be edited only with the appropriate permission.
- Source attribution for BOM quantity and pricing must survive parity work.
- New parity work must remain trade-agnostic even when test data uses low-voltage examples.

## Implementation sequence

1. Restore Quote Templates and template-to-quote application.
2. Bring Quote Builder working grid and item-add workflows to live parity.
3. Restore BOM groups/reorder and source-aware quantities.
4. Restore labor/difficulty and miscellaneous cost controls.
5. Restore alternates and breakouts.
6. Restore purchasing BOM.
7. Restore proposal/issue controls and immutable snapshot parity.
8. Complete side-by-side parity verification against the live application.

## Acceptance standard

Parity is not complete because a route or database table exists. A capability is complete only when an estimator can perform the comparable live workflow in the commercial Alpha, save/reload it, and obtain the expected totals/history without losing unrelated data.