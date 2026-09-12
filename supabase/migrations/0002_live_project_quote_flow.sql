-- ScopeLogic Software Alpha 1 — Batch 3
-- Live Company → Customer → Project → Quote creation flow.
-- APPLY ONLY TO THE NEW ISOLATED SCOPELOGIC SOFTWARE ALPHA PROJECT.

begin;

-- ---------------------------------------------------------------------------
-- Helper: current organization
-- Alpha 1 currently expects one active organization membership per user.
-- Multi-organization switching can be layered on later without changing record IDs.
-- ---------------------------------------------------------------------------

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_memberships m
  where m.user_id = (select auth.uid())
    and m.status = 'active'
  order by m.created_at
  limit 1;
$$;

grant execute on function private.current_organization_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Create customer
-- ---------------------------------------------------------------------------

create or replace function public.create_customer_for_current_org(
  customer_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  new_customer_id uuid;
begin
  org_id := (select private.current_organization_id());

  if org_id is null then
    raise exception 'Active organization membership required';
  end if;

  if not (select private.has_permission(org_id, 'customers.manage')) then
    raise exception 'Permission denied';
  end if;

  if customer_name is null or btrim(customer_name) = '' then
    raise exception 'Customer name is required';
  end if;

  insert into public.customers (
    organization_id,
    name,
    status,
    created_by_user_id
  )
  values (
    org_id,
    btrim(customer_name),
    'active',
    (select auth.uid())
  )
  returning id into new_customer_id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    details
  )
  values (
    org_id,
    (select auth.uid()),
    'customer',
    new_customer_id,
    'customer.created',
    jsonb_build_object('name', btrim(customer_name))
  );

  return new_customer_id;
end;
$$;

revoke all on function public.create_customer_for_current_org(text) from public;
grant execute on function public.create_customer_for_current_org(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Create project
-- ---------------------------------------------------------------------------

create or replace function public.create_project_for_current_org(
  project_number_input text,
  project_name_input text,
  customer_id_input uuid default null,
  project_status_input text default 'estimating',
  bid_date_input date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  new_project_id uuid;
  normalized_status public.project_status;
begin
  org_id := (select private.current_organization_id());

  if org_id is null then
    raise exception 'Active organization membership required';
  end if;

  if not (select private.has_permission(org_id, 'projects.create')) then
    raise exception 'Permission denied';
  end if;

  if project_number_input is null or btrim(project_number_input) = '' then
    raise exception 'Project number is required';
  end if;

  if project_name_input is null or btrim(project_name_input) = '' then
    raise exception 'Project name is required';
  end if;

  begin
    normalized_status := project_status_input::public.project_status;
  exception
    when invalid_text_representation then
      normalized_status := 'estimating'::public.project_status;
  end;

  if customer_id_input is not null and not exists (
    select 1
    from public.customers c
    where c.id = customer_id_input
      and c.organization_id = org_id
  ) then
    raise exception 'Customer is not available in this organization';
  end if;

  insert into public.projects (
    organization_id,
    customer_id,
    project_number,
    name,
    status,
    bid_date,
    created_by_user_id
  )
  values (
    org_id,
    customer_id_input,
    btrim(project_number_input),
    btrim(project_name_input),
    normalized_status,
    case
      when bid_date_input is null then null
      else bid_date_input::timestamptz
    end,
    (select auth.uid())
  )
  returning id into new_project_id;

  -- Creator is assigned so Assigned Only users retain access to what they create.
  insert into public.project_assignments (
    project_id,
    user_id,
    assigned_by_user_id
  )
  values (
    new_project_id,
    (select auth.uid()),
    (select auth.uid())
  )
  on conflict do nothing;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    details
  )
  values (
    org_id,
    (select auth.uid()),
    'project',
    new_project_id,
    'project.created',
    jsonb_build_object(
      'project_number', btrim(project_number_input),
      'name', btrim(project_name_input)
    )
  );

  return new_project_id;
end;
$$;

revoke all on function public.create_project_for_current_org(text, text, uuid, text, date) from public;
grant execute on function public.create_project_for_current_org(text, text, uuid, text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Create quote + initial 0.0 version atomically
-- ---------------------------------------------------------------------------

create or replace function public.create_quote_with_initial_version(
  project_id_input uuid,
  quote_number_input text,
  quote_name_input text,
  trade_scope_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  project_org_id uuid;
  new_quote_id uuid;
  new_version_id uuid;
begin
  select p.organization_id
  into project_org_id
  from public.projects p
  where p.id = project_id_input;

  if project_org_id is null then
    raise exception 'Project not found';
  end if;

  org_id := project_org_id;

  if not (select private.can_access_project(project_id_input)) then
    raise exception 'Project access denied';
  end if;

  if not (select private.has_permission(org_id, 'quotes.create')) then
    raise exception 'Permission denied';
  end if;

  if quote_number_input is null or btrim(quote_number_input) = '' then
    raise exception 'Quote number is required';
  end if;

  if quote_name_input is null or btrim(quote_name_input) = '' then
    raise exception 'Quote name is required';
  end if;

  insert into public.quotes (
    organization_id,
    project_id,
    quote_number,
    name,
    trade_scope,
    status,
    created_by_user_id
  )
  values (
    org_id,
    project_id_input,
    btrim(quote_number_input),
    btrim(quote_name_input),
    nullif(btrim(trade_scope_input), ''),
    'draft',
    (select auth.uid())
  )
  returning id into new_quote_id;

  insert into public.quote_assignments (
    quote_id,
    user_id,
    assigned_by_user_id
  )
  values (
    new_quote_id,
    (select auth.uid()),
    (select auth.uid())
  )
  on conflict do nothing;

  insert into public.quote_versions (
    organization_id,
    quote_id,
    version_major,
    version_minor,
    status,
    revision_reason,
    created_by_user_id
  )
  values (
    org_id,
    new_quote_id,
    0,
    0,
    'draft',
    'Original',
    (select auth.uid())
  )
  returning id into new_version_id;

  update public.quotes
  set current_version_id = new_version_id
  where id = new_quote_id;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    details
  )
  values (
    org_id,
    (select auth.uid()),
    'quote',
    new_quote_id,
    'quote.created',
    jsonb_build_object(
      'quote_number', btrim(quote_number_input),
      'name', btrim(quote_name_input),
      'initial_version', '0.0'
    )
  );

  return new_quote_id;
end;
$$;

revoke all on function public.create_quote_with_initial_version(uuid, text, text, text) from public;
grant execute on function public.create_quote_with_initial_version(uuid, text, text, text) to authenticated;

commit;
