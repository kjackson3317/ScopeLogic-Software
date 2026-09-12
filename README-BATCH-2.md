# ScopeLogic Software — Batch 2

This batch adds the isolated Supabase/data foundation for Alpha 1.

## What this batch adds

- Supabase browser/server clients
- Alpha login page
- health/config endpoint
- organization/company tenancy schema
- organization memberships
- custom roles and role permissions
- per-user permission overrides
- module entitlements
- customers
- projects and project assignments
- quotes and quote versions
- quote assignments
- audit events
- Row Level Security helpers and policies
- automatic seeding of the seven approved default roles for every organization
- internal immutable UUIDs with separate company-facing business numbers
- `assigned` vs `all` access scope at membership level

## What this batch does NOT do

- It does not connect to the existing ScopeLogic production Supabase project.
- It does not create a Supabase project automatically.
- It does not contain production credentials.
- It does not modify `app.scopelogic.net`.
- It does not yet wire the Projects and Quotes UI to live database data.

## Upload instructions

Extract the ZIP and upload the **contents** of this folder into the root of the existing `ScopeLogic-Software` repository.

Allow these existing files to be replaced:

- `.env.example`
- `apps/web/package.json`

Everything else in this batch is new.

## After upload

Do **not** point these files at the existing ScopeLogic Supabase project.

When you are ready for the isolated Alpha database, create a brand-new Supabase project for **ScopeLogic Software Alpha**. Then the migration in:

`supabase/migrations/0001_alpha_foundation.sql`

will be applied to that new project only.

The required web environment values will be:

```env
NEXT_PUBLIC_APP_ENV=alpha
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Security model established here

Access is resolved in layers:

1. User must be an active member of the organization.
2. The organization must have the relevant module entitlement.
3. The user's role permissions and optional user overrides determine allowed actions.
4. Project/quote access respects `assigned` vs `all`.
5. PostgreSQL Row Level Security remains the final enforcement layer.

The primary Administrator role is seeded with full permissions and `all` access.

## Next batch

Batch 3 will wire the application to this model and add:

- organization onboarding/bootstrap
- authenticated app shell
- Customers
- live Projects list/create/edit
- project assignments
- project detail shell
- live Quotes list/create
- automatic project quote roll-up foundation
