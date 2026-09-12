# ScopeLogic Software Alpha — Supabase

This directory is for the **new isolated commercial software Alpha database only**.

Do not apply these migrations to the existing ScopeLogic production Supabase project.

## Migration order

1. `migrations/0001_alpha_foundation.sql`

## Foundation concepts

- `organizations`: customer companies / tenants
- `organization_memberships`: users belonging to organizations
- `organization_roles`: company roles, including seeded default roles
- `role_permissions`: granular permission grants
- `member_permission_overrides`: per-user allow/deny overrides
- `organization_module_entitlements`: licensed product modules
- `customers`
- `projects`
- `project_assignments`
- `quotes`
- `quote_assignments`
- `quote_versions`
- `audit_events`

All business records use immutable UUID primary keys. Company-facing numbering is stored separately and may be customized later without affecting internal relationships.

## Default roles

Every new organization receives:

- Administrator
- Executive
- Manager
- Estimator
- Project Manager
- Sales
- Viewer

The Administrator role is seeded with all Alpha permissions.
