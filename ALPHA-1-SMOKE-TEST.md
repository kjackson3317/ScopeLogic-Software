# ScopeLogic Software Alpha 1 — Smoke Test

Run after migrations 0001–0008 and deployment.

## Access / tenant
- [ ] Alpha user can sign in.
- [ ] User without an organization is routed to onboarding.
- [ ] Company creation seeds the default roles.
- [ ] Core, Quote, and Rules modules are enabled.
- [ ] Unlicensed modules stay hidden.

## CRM / Projects
- [ ] Create customer.
- [ ] Create project.
- [ ] Project appears in the Projects table.

## Quote
- [ ] Create quote under project.
- [ ] Quote begins at 0.0.
- [ ] Add manual estimate line.
- [ ] Costs / sell / margin recalculate.
- [ ] Finalize using the in-app confirmation.
- [ ] Create regular revision 0.1.
- [ ] Prior version remains unchanged/read-only.
- [ ] Change-order numbering uses the next major number.

## Catalog / pricing
- [ ] Catalog tables load.
- [ ] Supplier and labor schedule pages load.
- [ ] Project pricing remains separate from master catalog values.

## Rules
- [ ] Create rule.
- [ ] Add manual quantity input.
- [ ] Run Rules.
- [ ] Calculated result appears.
- [ ] Rules do not silently overwrite BOM quantities.

## Documents
- [ ] Project folders load.
- [ ] Upload a general file.
- [ ] Upload a controlled drawing/specification.
- [ ] Controlled document is marked for review.

## Proposal
- [ ] Enter quote scope.
- [ ] Proposal Preview uses the active profile.
- [ ] Branding uses the company primary color.
- [ ] Browser Print / Save as PDF works.

## Safety / architecture
- [ ] No browser-native alert/confirm/prompt dialogs.
- [ ] Existing production ScopeLogic credentials are not present.
- [ ] Existing ScopeLogic production Supabase/Vercel projects are untouched.
- [ ] No production customer data is used in Alpha.
