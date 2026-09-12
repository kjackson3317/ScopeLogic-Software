# ScopeLogic Software — Batch 9

Batch 9 is the Alpha 1 hardening package.

## Adds / changes
- removes the browser-native `confirm()` used by Batch 4 finalization
- replaces it with an in-app confirmation panel
- adds diagnostics
- adds database integrity checks/indexes
- adds Alpha smoke-test checklist
- adds an Alpha database validation query
- keeps future/premium modules disabled unless explicitly enabled

## Upload
Extract and upload the contents to the repository root.

## Database
After migration 0007, apply:

`supabase/migrations/0008_alpha_hardening.sql`

## After Batch 9
The repository-side Alpha 1 batches are complete enough for the first integrated runtime/test pass.
