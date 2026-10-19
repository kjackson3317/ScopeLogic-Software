# ScopeLogic Quote Builder + Bluebeam — Demo branch

Branch: demo/quote-bluebeam-alpha. This is an isolated demonstration build of ScopeLogic-Software, NOT app.scopelogic.net. Do not connect its production database, customer records, storage, or domains.

## Scope
Demo navigation is Quote Builder, Parts Database and Rule Engine. Customer and project creation remain available as quote prerequisites. Unrelated source modules remain present; this is not yet a fully hardened standalone production environment.

## Revu local PDF workflows

The Bluebeam import supports either:
- Ordinary custom Tool Chest / shape markups: one placement per CSV markup row.
- Revu Count Tool or customized Count symbols: use the explicit Count measurement from each markup row, including grouped Count placements.

Bluebeam exports identifying fields Subject, Color, Label and optionally an organization-defined custom Device Code, Symbol Code, Symbol ID or Shape column. **CSV cannot infer actual geometry when different polygon markups have identical exported values.** A triangle and diamond could be indistinguishable if both share Polygon subject and color without unique metadata. Assign meaningful Subject or Label values to saved tools when necessary; do not embed what a symbol includes in Bluebeam.

## Test steps
1. Open a local drawing and use normal Tool Chest symbols.
2. Revu Markups List > Summary > CSV; export Markups only, not Totals.
3. Include Subject, Color, Label, Page Label, and Count (when Count Tool symbols are used). An optional custom Device Code column helps differentiate shapes.
4. In the isolated demo, create a sample customer/project/quote and corresponding rule input keys.
5. Quote > Quantities > Import Custom Symbol Takeoff.
6. Grouping is by Subject + Color + Label + optional Shape/Device Code. Assign or explicitly exclude every signature.
7. Verify ambiguous generic polygons before approval. Mappings and exclusions are saved for later imports within the test organization.
8. Review new vs prior quantities; approve; Run Rules; explicitly accept relevant BOM recommendations.
9. Re-import changed takeoff CSV: Bluebeam quantities replace previous Bluebeam values; manual quantities are retained; accepted rules should update existing rule-derived BOM lines instead of stacking them.
10. Confirm estimate sell, cost, gross profit, proposal, revision history and permissions.

Example: examples/bluebeam-count-demo.csv.

## Deployment requirements (not completed)
- Use a separate Vercel demo project, NOT app.scopelogic.net.
- Restore/activate isolated **ScopeLogic Software Alpha** Supabase only once isolation is confirmed.
- Apply migrations **0001–0010** to the Alpha database, in order. The revised migration 0009 includes persistent custom symbol mappings; 0010 handles BOM resync.
- Use only demo URL and frontend publishable key; never expose secret/service-role credentials to the browser.
- Run pnpm install, pnpm typecheck, pnpm build and Alpha smoke tests.
- Test CSV shape/color collisions and grouped Count Tool behavior using a real Revu export before presentation.

## Known limitations
Code is committed to the demo branch but is not deployed or runtime QA-tested. Local CSV import is the implemented bridge. Bluebeam Studio API connects to Studio content rather than arbitrary local PDFs; direct local Revu MCP depends on subscription/version. The independent ScopeLogic Takeoff application remains separate development work.
