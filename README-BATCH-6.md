# ScopeLogic Software — Batch 6

Batch 6 adds Rules Engine v1 and Quote Quantity Inputs.

## Adds
- Quote Quantity Inputs
- manual quantity entry
- CSV paste/import endpoint foundation
- deterministic rule definitions
- Calculate Only and Recommend BOM behaviors
- rule execution history
- recommendation review queue
- accept-to-BOM workflow
- quantity-source traceability
- no automatic silent BOM edits

## Upload
Extract and upload the contents to the root of `ScopeLogic-Software`.

## Database
After migration 0004, apply:

`supabase/migrations/0005_rules_engine_quantity_inputs.sql`

## Recommendation acceptance
Recommend-BOM rule results can now be explicitly accepted into a selected estimate section. The accepted line retains `rule` as its source and creates a quantity contribution record.
