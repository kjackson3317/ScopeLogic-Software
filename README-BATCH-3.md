# ScopeLogic Software — Batch 3

Batch 3 wires the Alpha shell to the tenancy model created in Batch 2 and adds the first live Company → Customer → Project → Quote workflow.

## Adds

- authenticated application context
- automatic redirect to login/onboarding when appropriate
- organization onboarding
- live organization/user display in the application shell
- module-aware navigation
- live Home metrics
- live Customers list/create
- live Projects list/create
- project detail/overview
- project assignments foundation
- live Quotes list/create
- automatic initial quote version `0.0`
- current project quote roll-up
- API v1 create endpoints for Customers, Projects, and Quotes
- transactional database RPCs for creating Customers, Projects, and Quotes
- audit entries for those create operations

## Important

This still targets only the **new isolated ScopeLogic Software Alpha Supabase project**.

Do not use the production ScopeLogic credentials.

## Upload

Extract the ZIP and upload its **contents** to the root of `ScopeLogic-Software`.

Allow replacement of:

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/projects/page.tsx`
- `apps/web/app/quotes/page.tsx`
- `apps/web/app/crm/page.tsx`
- `apps/web/components/app-shell.tsx`
- `apps/web/components/page-header.tsx`

Everything else is new.

## Database

After Batch 2 migration `0001_alpha_foundation.sql` has been applied to the new Alpha database, apply:

`supabase/migrations/0002_live_project_quote_flow.sql`

## Expected first live workflow

1. Create an Alpha auth user.
2. Sign in at `/login`.
3. If the user has no organization, ScopeLogic routes to `/onboarding`.
4. Create the Alpha organization.
5. Add a customer.
6. Create a project.
7. Create a quote inside that project.
8. ScopeLogic creates version `0.0` automatically.
9. The project overview shows the quote and rolls its current sell value into the project total.

Batch 4 will add the quote estimating workspace, quote-version controls, structured estimate sections/lines, and the first central catalog hooks.
