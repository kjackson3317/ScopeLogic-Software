-- ScopeLogic Software Alpha 1 foundation
-- APPLY ONLY TO THE NEW ISOLATED SCOPELOGIC SOFTWARE ALPHA SUPABASE PROJECT.

begin;

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('invited', 'active', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'access_scope') then
    create type public.access_scope as enum ('assigned', 'all');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum (
      'opportunity',
      'estimating',
      'submitted',
      'pending_award',
      'awarded',
      'active',
      'complete',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum (
      'draft',
      'internal_review',
      'approved',
      'submitted',
      'negotiation',
      'awarded',
      'lost',
      'withdrawn',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'quote_version_status') then
    create type public.quote_version_status as enum (
      'draft',
      'finalized',
      'submitted',
      'awarded',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'permission_effect') then
    create type public.permission_effect as enum ('allow', 'deny');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Identity / tenancy
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_key text not null,
  name text not null,
  description text,
  is_system_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, role_key)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.organization_roles(id) on delete restrict,
  status public.membership_status not null default 'active',
  record_access_scope public.access_scope not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.organization_roles(id) on delete cascade,
  permission_key text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists public.member_permission_overrides (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  permission_key text not null,
  effect public.permission_effect not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, permission_key)
);

create table if not exists public.organization_module_entitlements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default false,
  seat_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, module_key),
  check (seat_limit is null or seat_limit >= 0)
);

-- ---------------------------------------------------------------------------
-- CRM / customers
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  external_ids jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_organization_id_idx
  on public.customers(organization_id);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  project_number text not null,
  name text not null,
  status public.project_status not null default 'estimating',
  description text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  bid_date timestamptz,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_number)
);

create index if not exists projects_organization_id_idx
  on public.projects(organization_id);

create index if not exists projects_customer_id_idx
  on public.projects(customer_id);

create table if not exists public.project_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Quotes / versions
-- ---------------------------------------------------------------------------

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  quote_number text not null,
  name text not null,
  trade_scope text,
  status public.quote_status not null default 'draft',
  current_version_id uuid,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number)
);

create index if not exists quotes_project_id_idx
  on public.quotes(project_id);

create table if not exists public.quote_assignments (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (quote_id, user_id)
);

create table if not exists public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version_major integer not null default 0 check (version_major >= 0),
  version_minor integer not null default 0 check (version_minor >= 0),
  display_version text generated always as (
    version_major::text || '.' || version_minor::text
  ) stored,
  status public.quote_version_status not null default 'draft',
  revision_reason text,
  revision_notes text,
  material_cost numeric(14,2) not null default 0,
  labor_cost numeric(14,2) not null default 0,
  other_cost numeric(14,2) not null default 0,
  total_cost numeric(14,2) generated always as (
    material_cost + labor_cost + other_cost
  ) stored,
  sell_price numeric(14,2) not null default 0,
  negotiated_adjustment numeric(14,2) not null default 0,
  final_sell_price numeric(14,2) generated always as (
    sell_price + negotiated_adjustment
  ) stored,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  labor_snapshot jsonb not null default '{}'::jsonb,
  created_from_version_id uuid references public.quote_versions(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (quote_id, version_major, version_minor)
);

alter table public.quotes
  drop constraint if exists quotes_current_version_id_fkey;

alter table public.quotes
  add constraint quotes_current_version_id_fkey
  foreign key (current_version_id)
  references public.quote_versions(id)
  on delete set null;

create index if not exists quote_versions_quote_id_idx
  on public.quote_versions(quote_id);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_organization_created_idx
  on public.audit_events(organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'organizations',
    'organization_roles',
    'organization_memberships',
    'organization_module_entitlements',
    'customers',
    'projects',
    'quotes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.touch_updated_at()',
      'touch_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create or replace function private.current_membership(target_organization uuid)
returns public.organization_memberships
language sql
stable
security definer
set search_path = ''
as $$
  select m.*
  from public.organization_memberships m
  where m.organization_id = target_organization
    and m.user_id = (select auth.uid())
    and m.status = 'active'
  limit 1;
$$;

create or replace function private.is_active_org_member(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_organization
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function private.is_primary_admin(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = target_organization
      and o.primary_admin_user_id = (select auth.uid())
  );
$$;

create or replace function private.module_enabled(target_organization uuid, target_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_module_entitlements e
    where e.organization_id = target_organization
      and e.module_key = target_module
      and e.enabled = true
      and (e.starts_at is null or e.starts_at <= now())
      and (e.ends_at is null or e.ends_at >= now())
  );
$$;

create or replace function private.has_permission(target_organization uuid, target_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when (select private.is_primary_admin(target_organization)) then true
      else coalesce(
        (
          select
            case
              when mpo.effect = 'deny' then false
              when mpo.effect = 'allow' then true
              else null
            end
          from public.organization_memberships m
          left join public.member_permission_overrides mpo
            on mpo.membership_id = m.id
           and mpo.permission_key = target_permission
          where m.organization_id = target_organization
            and m.user_id = (select auth.uid())
            and m.status = 'active'
          limit 1
        ),
        (
          select rp.allowed
          from public.organization_memberships m
          join public.role_permissions rp on rp.role_id = m.role_id
          where m.organization_id = target_organization
            and m.user_id = (select auth.uid())
            and m.status = 'active'
            and rp.permission_key = target_permission
          limit 1
        ),
        false
      )
    end;
$$;

create or replace function private.member_record_access_scope(target_organization uuid)
returns public.access_scope
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when (select private.is_primary_admin(target_organization)) then 'all'::public.access_scope
      else coalesce(
        (
          select m.record_access_scope
          from public.organization_memberships m
          where m.organization_id = target_organization
            and m.user_id = (select auth.uid())
            and m.status = 'active'
          limit 1
        ),
        'assigned'::public.access_scope
      )
    end;
$$;

create or replace function private.can_access_project(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project
      and (select private.is_active_org_member(p.organization_id))
      and (
        (select private.member_record_access_scope(p.organization_id)) = 'all'
        or exists (
          select 1
          from public.project_assignments pa
          where pa.project_id = p.id
            and pa.user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function private.can_access_quote(target_quote uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quotes q
    where q.id = target_quote
      and (select private.can_access_project(q.project_id))
      and (
        (select private.member_record_access_scope(q.organization_id)) = 'all'
        or exists (
          select 1
          from public.quote_assignments qa
          where qa.quote_id = q.id
            and qa.user_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.project_assignments pa
          where pa.project_id = q.project_id
            and pa.user_id = (select auth.uid())
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Default roles / permissions
-- ---------------------------------------------------------------------------

create or replace function private.seed_default_roles_for_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  administrator_role uuid;
  executive_role uuid;
  manager_role uuid;
  estimator_role uuid;
  project_manager_role uuid;
  sales_role uuid;
  viewer_role uuid;
  permission_key text;
begin
  insert into public.organization_roles (organization_id, role_key, name, description, is_system_default)
  values
    (new.id, 'administrator', 'Administrator', 'Full company control.', true),
    (new.id, 'executive', 'Executive', 'Broad company visibility and financial access.', true),
    (new.id, 'manager', 'Manager', 'Manages teams, projects, quotes, approvals, and standards.', true),
    (new.id, 'estimator', 'Estimator', 'Creates and maintains assigned estimates and related project work.', true),
    (new.id, 'project_manager', 'Project Manager', 'Works with assigned projects and project workflows.', true),
    (new.id, 'sales', 'Sales', 'Uses CRM, customers, opportunities, and permitted quote information.', true),
    (new.id, 'viewer', 'Viewer', 'Read-only access to permitted records.', true);

  select id into administrator_role from public.organization_roles
    where organization_id = new.id and role_key = 'administrator';
  select id into executive_role from public.organization_roles
    where organization_id = new.id and role_key = 'executive';
  select id into manager_role from public.organization_roles
    where organization_id = new.id and role_key = 'manager';
  select id into estimator_role from public.organization_roles
    where organization_id = new.id and role_key = 'estimator';
  select id into project_manager_role from public.organization_roles
    where organization_id = new.id and role_key = 'project_manager';
  select id into sales_role from public.organization_roles
    where organization_id = new.id and role_key = 'sales';
  select id into viewer_role from public.organization_roles
    where organization_id = new.id and role_key = 'viewer';

  foreach permission_key in array array[
    'organization.manage',
    'users.manage',
    'roles.manage',
    'modules.manage',
    'customers.view',
    'customers.manage',
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.archive',
    'projects.assign',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.archive',
    'quotes.assign',
    'quotes.approve',
    'quotes.issue',
    'quotes.view_cost',
    'quotes.change_cost',
    'quotes.enter_project_pricing',
    'quotes.approve_project_pricing',
    'rules.use',
    'rules.create',
    'rules.edit',
    'rules.publish',
    'rules.bypass_testing',
    'documents.view',
    'documents.upload',
    'documents.manage',
    'crm.view',
    'crm.manage'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (administrator_role, permission_key, true);
  end loop;

  -- Executive
  foreach permission_key in array array[
    'customers.view',
    'projects.view',
    'quotes.view',
    'quotes.approve',
    'quotes.view_cost',
    'documents.view',
    'crm.view'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (executive_role, permission_key, true);
  end loop;

  -- Manager
  foreach permission_key in array array[
    'customers.view',
    'customers.manage',
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.assign',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.assign',
    'quotes.approve',
    'quotes.issue',
    'quotes.view_cost',
    'quotes.enter_project_pricing',
    'quotes.approve_project_pricing',
    'rules.use',
    'rules.create',
    'rules.edit',
    'rules.publish',
    'documents.view',
    'documents.upload',
    'documents.manage',
    'crm.view',
    'crm.manage'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (manager_role, permission_key, true);
  end loop;

  -- Estimator
  foreach permission_key in array array[
    'customers.view',
    'projects.view',
    'projects.create',
    'projects.edit',
    'quotes.view',
    'quotes.create',
    'quotes.edit',
    'quotes.view_cost',
    'quotes.enter_project_pricing',
    'rules.use',
    'documents.view',
    'documents.upload'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (estimator_role, permission_key, true);
  end loop;

  -- Project Manager
  foreach permission_key in array array[
    'customers.view',
    'projects.view',
    'projects.edit',
    'quotes.view',
    'documents.view',
    'documents.upload'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (project_manager_role, permission_key, true);
  end loop;

  -- Sales
  foreach permission_key in array array[
    'customers.view',
    'customers.manage',
    'projects.view',
    'quotes.view',
    'crm.view',
    'crm.manage'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (sales_role, permission_key, true);
  end loop;

  -- Viewer
  foreach permission_key in array array[
    'customers.view',
    'projects.view',
    'quotes.view',
    'documents.view',
    'crm.view'
  ]
  loop
    insert into public.role_permissions (role_id, permission_key, allowed)
    values (viewer_role, permission_key, true);
  end loop;

  -- Core Alpha modules enabled by default.
  insert into public.organization_module_entitlements (organization_id, module_key, enabled)
  values
    (new.id, 'core', true),
    (new.id, 'quote', true),
    (new.id, 'rules', true),
    (new.id, 'scope_review', false),
    (new.id, 'bid_analysis', false),
    (new.id, 'takeoff', false),
    (new.id, 'integration_salesforce', false),
    (new.id, 'integration_vendor_pricing', false),
    (new.id, 'intelligence', false);

  return new;
end;
$$;

drop trigger if exists seed_default_roles_for_organization on public.organizations;
create trigger seed_default_roles_for_organization
after insert on public.organizations
for each row
execute function private.seed_default_roles_for_organization();

-- ---------------------------------------------------------------------------
-- Profile creation
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_roles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_permission_overrides enable row level security;
alter table public.organization_module_entitlements enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_assignments enable row level security;
alter table public.quote_versions enable row level security;
alter table public.audit_events enable row level security;

-- Profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Organizations
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
to authenticated
using ((select private.is_active_org_member(id)));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin
on public.organizations
for update
to authenticated
using ((select private.has_permission(id, 'organization.manage')))
with check ((select private.has_permission(id, 'organization.manage')));

-- Bootstrap organization creation is intentionally permitted to authenticated
-- users. The application onboarding function will immediately set the creator
-- as primary admin and create membership. Later Alpha work will move this into
-- an RPC transaction.
drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated
on public.organizations
for insert
to authenticated
with check (primary_admin_user_id = (select auth.uid()));

-- Roles
drop policy if exists roles_select_member on public.organization_roles;
create policy roles_select_member
on public.organization_roles
for select
to authenticated
using ((select private.is_active_org_member(organization_id)));

drop policy if exists roles_manage on public.organization_roles;
create policy roles_manage
on public.organization_roles
for all
to authenticated
using ((select private.has_permission(organization_id, 'roles.manage')))
with check ((select private.has_permission(organization_id, 'roles.manage')));

-- Memberships
drop policy if exists memberships_select_member on public.organization_memberships;
create policy memberships_select_member
on public.organization_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_permission(organization_id, 'users.manage'))
);

drop policy if exists memberships_manage on public.organization_memberships;
create policy memberships_manage
on public.organization_memberships
for all
to authenticated
using ((select private.has_permission(organization_id, 'users.manage')))
with check ((select private.has_permission(organization_id, 'users.manage')));

-- Role permissions
drop policy if exists role_permissions_select_member on public.role_permissions;
create policy role_permissions_select_member
on public.role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_roles r
    where r.id = role_id
      and (select private.is_active_org_member(r.organization_id))
  )
);

drop policy if exists role_permissions_manage on public.role_permissions;
create policy role_permissions_manage
on public.role_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_roles r
    where r.id = role_id
      and (select private.has_permission(r.organization_id, 'roles.manage'))
  )
)
with check (
  exists (
    select 1
    from public.organization_roles r
    where r.id = role_id
      and (select private.has_permission(r.organization_id, 'roles.manage'))
  )
);

-- Member permission overrides
drop policy if exists member_overrides_select on public.member_permission_overrides;
create policy member_overrides_select
on public.member_permission_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships m
    where m.id = membership_id
      and (
        m.user_id = (select auth.uid())
        or (select private.has_permission(m.organization_id, 'users.manage'))
      )
  )
);

drop policy if exists member_overrides_manage on public.member_permission_overrides;
create policy member_overrides_manage
on public.member_permission_overrides
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships m
    where m.id = membership_id
      and (select private.has_permission(m.organization_id, 'users.manage'))
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships m
    where m.id = membership_id
      and (select private.has_permission(m.organization_id, 'users.manage'))
  )
);

-- Module entitlements
drop policy if exists module_entitlements_select_member on public.organization_module_entitlements;
create policy module_entitlements_select_member
on public.organization_module_entitlements
for select
to authenticated
using ((select private.is_active_org_member(organization_id)));

drop policy if exists module_entitlements_manage_admin on public.organization_module_entitlements;
create policy module_entitlements_manage_admin
on public.organization_module_entitlements
for all
to authenticated
using ((select private.has_permission(organization_id, 'modules.manage')))
with check ((select private.has_permission(organization_id, 'modules.manage')));

-- Customers
drop policy if exists customers_select on public.customers;
create policy customers_select
on public.customers
for select
to authenticated
using (
  (select private.is_active_org_member(organization_id))
  and (select private.has_permission(organization_id, 'customers.view'))
);

drop policy if exists customers_insert on public.customers;
create policy customers_insert
on public.customers
for insert
to authenticated
with check (
  (select private.is_active_org_member(organization_id))
  and (select private.has_permission(organization_id, 'customers.manage'))
);

drop policy if exists customers_update on public.customers;
create policy customers_update
on public.customers
for update
to authenticated
using ((select private.has_permission(organization_id, 'customers.manage')))
with check ((select private.has_permission(organization_id, 'customers.manage')));

drop policy if exists customers_delete on public.customers;
create policy customers_delete
on public.customers
for delete
to authenticated
using ((select private.has_permission(organization_id, 'customers.manage')));

-- Projects
drop policy if exists projects_select on public.projects;
create policy projects_select
on public.projects
for select
to authenticated
using (
  (select private.has_permission(organization_id, 'projects.view'))
  and (select private.can_access_project(id))
);

drop policy if exists projects_insert on public.projects;
create policy projects_insert
on public.projects
for insert
to authenticated
with check (
  (select private.is_active_org_member(organization_id))
  and (select private.has_permission(organization_id, 'projects.create'))
);

drop policy if exists projects_update on public.projects;
create policy projects_update
on public.projects
for update
to authenticated
using (
  (select private.can_access_project(id))
  and (select private.has_permission(organization_id, 'projects.edit'))
)
with check ((select private.has_permission(organization_id, 'projects.edit')));

drop policy if exists projects_delete on public.projects;
create policy projects_delete
on public.projects
for delete
to authenticated
using (
  (select private.can_access_project(id))
  and (select private.has_permission(organization_id, 'projects.archive'))
);

-- Project assignments
drop policy if exists project_assignments_select on public.project_assignments;
create policy project_assignments_select
on public.project_assignments
for select
to authenticated
using ((select private.can_access_project(project_id)));

drop policy if exists project_assignments_manage on public.project_assignments;
create policy project_assignments_manage
on public.project_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (select private.has_permission(p.organization_id, 'projects.assign'))
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (select private.has_permission(p.organization_id, 'projects.assign'))
  )
);

-- Quotes
drop policy if exists quotes_select on public.quotes;
create policy quotes_select
on public.quotes
for select
to authenticated
using (
  (select private.has_permission(organization_id, 'quotes.view'))
  and (select private.can_access_quote(id))
);

drop policy if exists quotes_insert on public.quotes;
create policy quotes_insert
on public.quotes
for insert
to authenticated
with check (
  (select private.can_access_project(project_id))
  and (select private.has_permission(organization_id, 'quotes.create'))
);

drop policy if exists quotes_update on public.quotes;
create policy quotes_update
on public.quotes
for update
to authenticated
using (
  (select private.can_access_quote(id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
)
with check ((select private.has_permission(organization_id, 'quotes.edit')));

drop policy if exists quotes_delete on public.quotes;
create policy quotes_delete
on public.quotes
for delete
to authenticated
using (
  (select private.can_access_quote(id))
  and (select private.has_permission(organization_id, 'quotes.archive'))
);

-- Quote assignments
drop policy if exists quote_assignments_select on public.quote_assignments;
create policy quote_assignments_select
on public.quote_assignments
for select
to authenticated
using ((select private.can_access_quote(quote_id)));

drop policy if exists quote_assignments_manage on public.quote_assignments;
create policy quote_assignments_manage
on public.quote_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and (select private.has_permission(q.organization_id, 'quotes.assign'))
  )
)
with check (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and (select private.has_permission(q.organization_id, 'quotes.assign'))
  )
);

-- Quote versions
drop policy if exists quote_versions_select on public.quote_versions;
create policy quote_versions_select
on public.quote_versions
for select
to authenticated
using (
  (select private.has_permission(organization_id, 'quotes.view'))
  and (select private.can_access_quote(quote_id))
);

drop policy if exists quote_versions_insert on public.quote_versions;
create policy quote_versions_insert
on public.quote_versions
for insert
to authenticated
with check (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists quote_versions_update on public.quote_versions;
create policy quote_versions_update
on public.quote_versions
for update
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
)
with check (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

-- Audit events are readable by active org members and insertable by users who
-- are acting inside their organization. Deletion/update are intentionally absent.
drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select
on public.audit_events
for select
to authenticated
using ((select private.is_active_org_member(organization_id)));

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert
on public.audit_events
for insert
to authenticated
with check ((select private.is_active_org_member(organization_id)));

-- ---------------------------------------------------------------------------
-- Bootstrap RPC
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_for_current_user(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  administrator_role_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if organization_name is null or btrim(organization_name) = '' then
    raise exception 'Organization name is required';
  end if;

  if organization_slug is null or btrim(organization_slug) = '' then
    raise exception 'Organization slug is required';
  end if;

  insert into public.organizations (name, slug, primary_admin_user_id)
  values (btrim(organization_name), lower(btrim(organization_slug)), (select auth.uid()))
  returning id into new_org_id;

  select id
  into administrator_role_id
  from public.organization_roles
  where organization_id = new_org_id
    and role_key = 'administrator';

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role_id,
    status,
    record_access_scope
  )
  values (
    new_org_id,
    (select auth.uid()),
    administrator_role_id,
    'active',
    'all'
  );

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    details
  )
  values (
    new_org_id,
    (select auth.uid()),
    'organization',
    new_org_id,
    'organization.created',
    jsonb_build_object('name', organization_name)
  );

  return new_org_id;
end;
$$;

revoke all on function public.create_organization_for_current_user(text, text) from public;
grant execute on function public.create_organization_for_current_user(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_roles to authenticated;
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select, insert, update, delete on public.role_permissions to authenticated;
grant select, insert, update, delete on public.member_permission_overrides to authenticated;
grant select, insert, update, delete on public.organization_module_entitlements to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_assignments to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_assignments to authenticated;
grant select, insert, update on public.quote_versions to authenticated;
grant select, insert on public.audit_events to authenticated;

grant execute on function private.is_active_org_member(uuid) to authenticated;
grant execute on function private.is_primary_admin(uuid) to authenticated;
grant execute on function private.module_enabled(uuid, text) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.member_record_access_scope(uuid) to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;
grant execute on function private.can_access_quote(uuid) to authenticated;

commit;
