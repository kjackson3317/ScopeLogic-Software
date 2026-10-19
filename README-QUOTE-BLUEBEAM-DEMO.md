# ScopeLogic Quote Builder + Bluebeam — Demo branch

Branch: demo/quote-bluebeam-alpha. This is an isolated demonstration build of
ScopeLogic-Software, NOT app.scopelogic.net. Do not connect production ScopeLogic
database credentials, customers, storage or domains.

## Scope

Navigation is reduced to Quote Builder, Parts Database and Rule Engine.
Customer and project creation remain available only for establishing quote
context. No unrelated consulting/RFP review or experimental takeoff UI is
presented as a demo capability. Existing modules are retained in source code
to avoid a destructive rewrite; they are not part of this demonstration.

## Bluebeam connection V1: Revu export

1. Open a sample drawing in Bluebeam Revu (suitable subscription required).
2. Place count markups; use consistent Subject names such as D-DATA or CAM-IP.
3. In Markups List choose Summary > CSV; include Subject and, if available,
   Count. Export as .csv. The importer does not read arbitrary length/area
   measurements or OCR the drawing.
4. In ScopeLogic create a customer and a project (only if no demo record exists).
5. Create a Quote and its initial 0.0 version.
6. In Parts Database, create the needed catalog items.
7. In Rules Engine, define one or more BOM recommendation rules. Assign
   relevant input keys and catalog items.
8. Open Quote > Quantities > Import Count Takeoff. Choose CSV.
9. Map each Bluebeam Subject to the corresponding ScopeLogic input key.
10. Review old vs new quantities including removed subjects; check acknowledgement.
11. Apply quantities, click Run Rules, and explicitly accept recommendations
    into the BOM. Inspect the estimate cost, sell and margin.
12. Re-import a revised CSV: changed counts should replace the previous
    Bluebeam quantity snapshot without deleting manual quantity inputs.

## Required deployment prerequisites

- Dedicated Vercel demo project with repo root configured for monorepo.
- Isolated ScopeLogic Software Alpha Supabase project; it is NOT the
  ScopeLogic Production project.
- Apply migrations 0001 to 0010 in the isolated Alpha project, in order.
- Configure only isolated Alpha Supabase URL and publishable key (frontend).
- Create a demo user/org. Keep actual customer data out of Alpha.
- Validate that the quote and rules entitlements are enabled.
- Execute pnpm install, pnpm typecheck and pnpm build; these have not been
  performed by the connector-only code editing flow.
- Apply the existing ALPHA-1-SMOKE-TEST.md and then the Bluebeam test below.

## Bluebeam test assertions

- No source file = no import.
- Missing Subject column, invalid counts, malformed quotes and empty files fail.
- Quoted CSV Subjects and repeated symbols group correctly.
- Unmapped Subjects block Apply.
- Two Subjects mapped to the same Rule input are summed once.
- Existing Bluebeam inputs absent from the new reviewed file are removed.
- Manual inputs and estimate BOM lines are untouched during quantity import.
- Rule execution selects Bluebeam over manual if they share an input key.
- Import fails for finalized historical versions or unauthorized users.
- Rule result acceptance is explicit; no automatic BOM updates on import.
- Source file and import counts are recorded for the draft quote version.

## Bluebeam Studio API — next integration stage

Developer docs: https://developers.bluebeam.com/
The Studio Markups API v2 supports measurement data, geometry and custom columns
for markups in Studio Sessions. It does not imply direct server-side access to
every local Revu PDF. Use OAuth authorization-code flow with server-side secure
credential storage and access-limited callback; do not put client secrets in
NEXT_PUBLIC variables.

Obtain a Bluebeam BBID on a Core, Complete, or Max plan and create a
Sandbox application in the Bluebeam Developer Portal. A Production Approval
request is needed before a customer-facing direct API integration goes live.
The precise markup endpoint payload must be verified with a real Sandbox
session, then adapt its count markups to the same quantity snapshot review
data model. Do not enable unsupervised automatic quote changes from webhooks.
The Revu MCP local bridge is a separate option and requires version and
client-transport validation.

## Known incomplete items

This branch has not been deployed or runtime-tested. No Bluebeam OAuth client
credentials are configured. Bluebeam CSV is the implemented bridge; Studio
API, direct PDF takeoff and desktop-to-web synchronization remain future work.
This branch requires functional QA before any production demonstration.
