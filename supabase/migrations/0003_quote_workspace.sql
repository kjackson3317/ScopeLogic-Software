-- ScopeLogic Software Alpha 1 — Batch 4
-- Structured Quote Workspace, immutable history, estimate lines, and revisions.
-- APPLY ONLY TO THE NEW ISOLATED SCOPELOGIC SOFTWARE ALPHA PROJECT.

begin;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estimate_line_type') then
    create type public.estimate_line_type as enum (
      'material',
      'equipment',
      'labor',
      'subcontract',
      'service',
      'rental',
      'allowance',
      'fee',
      'misc'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'estimate_source_type') then
    create type public.estimate_source_type as enum (
      'manual',
      'catalog',
      'assembly',
      'rule',
      'import',
      'takeoff',
      'project_pricing'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Estimate sections / lines
-- ---------------------------------------------------------------------------

create table if not exists public.estimate_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  name text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (quote_version_id, name)
);

create index if not exists estimate_sections_version_idx
  on public.estimate_sections(quote_version_id, sort_order);

create table if not exists public.estimate_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  section_id uuid not null references public.estimate_sections(id) on delete cascade,
  line_type public.estimate_line_type not null default 'material',
  source_type public.estimate_source_type not null default 'manual',
  source_id uuid,
  manufacturer text,
  part_number text,
  description text not null,
  uom text not null default 'EA',
  quantity numeric(16,4) not null default 1 check (quantity >= 0),
  unit_material_cost numeric(16,4) not null default 0 check (unit_material_cost >= 0),
  labor_hours_per_unit numeric(16,4) not null default 0 check (labor_hours_per_unit >= 0),
  labor_rate numeric(16,4) not null default 0 check (labor_rate >= 0),
  unit_other_cost numeric(16,4) not null default 0 check (unit_other_cost >= 0),
  unit_sell numeric(16,4) not null default 0 check (unit_sell >= 0),
  material_cost numeric(18,4) generated always as (
    quantity * unit_material_cost
  ) stored,
  labor_cost numeric(18,4) generated always as (
    quantity * labor_hours_per_unit * labor_rate
  ) stored,
  other_cost numeric(18,4) generated always as (
    quantity * unit_other_cost
  ) stored,
  total_cost numeric(18,4) generated always as (
    (quantity * unit_material_cost)
    + (quantity * labor_hours_per_unit * labor_rate)
    + (quantity * unit_other_cost)
  ) stored,
  extended_sell numeric(18,4) generated always as (
    quantity * unit_sell
  ) stored,
  gross_profit numeric(18,4) generated always as (
    (quantity * unit_sell)
    - (
      (quantity * unit_material_cost)
      + (quantity * labor_hours_per_unit * labor_rate)
      + (quantity * unit_other_cost)
    )
  ) stored,
  margin_pct numeric(12,6) generated always as (
    case
      when (quantity * unit_sell) = 0 then 0
      else (
        (
          (quantity * unit_sell)
          - (
            (quantity * unit_material_cost)
            + (quantity * labor_hours_per_unit * labor_rate)
            + (quantity * unit_other_cost)
          )
        )
        / (quantity * unit_sell)
      ) * 100
    end
  ) stored,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimate_lines_version_idx
  on public.estimate_lines(quote_version_id, section_id, sort_order);

create table if not exists public.quantity_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  estimate_line_id uuid not null references public.estimate_lines(id) on delete cascade,
  source_type public.estimate_source_type not null,
  source_id uuid,
  label text not null,
  quantity numeric(16,4) not null default 0 check (quantity >= 0),
  uom text not null,
  created_at timestamptz not null default now()
);

create index if not exists quantity_contributions_line_idx
  on public.quantity_contributions(estimate_line_id);

-- ---------------------------------------------------------------------------
-- Updated-at
-- ---------------------------------------------------------------------------

drop trigger if exists touch_estimate_lines_updated_at on public.estimate_lines;
create trigger touch_estimate_lines_updated_at
before update on public.estimate_lines
for each row
execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Draft guard
-- ---------------------------------------------------------------------------

create or replace function private.assert_quote_version_is_draft(target_version uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  version_status public.quote_version_status;
begin
  select qv.status
  into version_status
  from public.quote_versions qv
  where qv.id = target_version;

  if version_status is null then
    raise exception 'Quote Version not found';
  end if;

  if version_status <> 'draft'::public.quote_version_status then
    raise exception 'Historical Quote Versions are read-only. Create a revision to make changes.';
  end if;
end;
$$;

grant execute on function private.assert_quote_version_is_draft(uuid) to authenticated;

create or replace function private.prevent_historical_estimate_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_version uuid;
begin
  target_version := coalesce(new.quote_version_id, old.quote_version_id);
  perform private.assert_quote_version_is_draft(target_version);
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_estimate_sections_mutation on public.estimate_sections;
create trigger guard_estimate_sections_mutation
before insert or update or delete on public.estimate_sections
for each row
execute function private.prevent_historical_estimate_mutation();

drop trigger if exists guard_estimate_lines_mutation on public.estimate_lines;
create trigger guard_estimate_lines_mutation
before insert or update or delete on public.estimate_lines
for each row
execute function private.prevent_historical_estimate_mutation();

drop trigger if exists guard_quantity_contributions_mutation on public.quantity_contributions;
create trigger guard_quantity_contributions_mutation
before insert or update or delete on public.quantity_contributions
for each row
execute function private.prevent_historical_estimate_mutation();

-- ---------------------------------------------------------------------------
-- Recalculate Quote Version totals from estimate lines
-- ---------------------------------------------------------------------------

create or replace function private.recalculate_quote_version_totals(target_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.quote_versions qv
  set
    material_cost = coalesce((
      select sum(el.material_cost)
      from public.estimate_lines el
      where el.quote_version_id = target_version
    ), 0),
    labor_cost = coalesce((
      select sum(el.labor_cost)
      from public.estimate_lines el
      where el.quote_version_id = target_version
    ), 0),
    other_cost = coalesce((
      select sum(el.other_cost)
      from public.estimate_lines el
      where el.quote_version_id = target_version
    ), 0),
    sell_price = coalesce((
      select sum(el.extended_sell)
      from public.estimate_lines el
      where el.quote_version_id = target_version
    ), 0)
  where qv.id = target_version;
end;
$$;

create or replace function private.recalculate_totals_after_line_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.recalculate_quote_version_totals(old.quote_version_id);
    return old;
  end if;

  perform private.recalculate_quote_version_totals(new.quote_version_id);

  if tg_op = 'UPDATE' and old.quote_version_id <> new.quote_version_id then
    perform private.recalculate_quote_version_totals(old.quote_version_id);
  end if;

  return new;
end;
$$;

drop trigger if exists recalc_totals_after_estimate_line on public.estimate_lines;
create trigger recalc_totals_after_estimate_line
after insert or update or delete on public.estimate_lines
for each row
execute function private.recalculate_totals_after_line_change();

-- ---------------------------------------------------------------------------
-- Seed a default Base Estimate section for existing draft versions
-- ---------------------------------------------------------------------------

insert into public.estimate_sections (
  organization_id,
  quote_id,
  quote_version_id,
  name,
  sort_order
)
select
  qv.organization_id,
  qv.quote_id,
  qv.id,
  'Base Estimate',
  100
from public.quote_versions qv
where qv.status = 'draft'
  and not exists (
    select 1
    from public.estimate_sections es
    where es.quote_version_id = qv.id
  );

-- ---------------------------------------------------------------------------
-- Replace quote creation RPC so every new quote receives Base Estimate
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

  insert into public.estimate_sections (
    organization_id,
    quote_id,
    quote_version_id,
    name,
    sort_order
  )
  values (
    org_id,
    new_quote_id,
    new_version_id,
    'Base Estimate',
    100
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

-- ---------------------------------------------------------------------------
-- Estimate mutation RPCs
-- ---------------------------------------------------------------------------

create or replace function public.add_estimate_section(
  quote_id_input uuid,
  section_name_input text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  current_version uuid;
  next_sort integer;
  new_section_id uuid;
begin
  select q.organization_id, q.current_version_id
  into org_id, current_version
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or current_version is null then
    raise exception 'Quote not found';
  end if;

  if not (select private.can_access_quote(quote_id_input))
     or not (select private.has_permission(org_id, 'quotes.edit')) then
    raise exception 'Permission denied';
  end if;

  perform private.assert_quote_version_is_draft(current_version);

  if section_name_input is null or btrim(section_name_input) = '' then
    raise exception 'Section name is required';
  end if;

  select coalesce(max(sort_order), 0) + 100
  into next_sort
  from public.estimate_sections
  where quote_version_id = current_version;

  insert into public.estimate_sections (
    organization_id,
    quote_id,
    quote_version_id,
    name,
    sort_order
  )
  values (
    org_id,
    quote_id_input,
    current_version,
    btrim(section_name_input),
    next_sort
  )
  returning id into new_section_id;

  return new_section_id;
end;
$$;

create or replace function public.add_manual_estimate_line(
  quote_id_input uuid,
  section_id_input uuid,
  line_type_input text,
  manufacturer_input text,
  part_number_input text,
  description_input text,
  uom_input text,
  quantity_input numeric,
  unit_material_cost_input numeric,
  labor_hours_per_unit_input numeric,
  labor_rate_input numeric,
  unit_other_cost_input numeric,
  unit_sell_input numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  current_version uuid;
  normalized_line_type public.estimate_line_type;
  next_sort integer;
  new_line_id uuid;
begin
  select q.organization_id, q.current_version_id
  into org_id, current_version
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or current_version is null then
    raise exception 'Quote not found';
  end if;

  if not (select private.can_access_quote(quote_id_input))
     or not (select private.has_permission(org_id, 'quotes.edit')) then
    raise exception 'Permission denied';
  end if;

  perform private.assert_quote_version_is_draft(current_version);

  if not exists (
    select 1
    from public.estimate_sections es
    where es.id = section_id_input
      and es.quote_id = quote_id_input
      and es.quote_version_id = current_version
  ) then
    raise exception 'Estimate section is not part of the current Quote Version';
  end if;

  if description_input is null or btrim(description_input) = '' then
    raise exception 'Description is required';
  end if;

  begin
    normalized_line_type := line_type_input::public.estimate_line_type;
  exception
    when invalid_text_representation then
      normalized_line_type := 'material'::public.estimate_line_type;
  end;

  select coalesce(max(sort_order), 0) + 10
  into next_sort
  from public.estimate_lines
  where section_id = section_id_input;

  insert into public.estimate_lines (
    organization_id,
    quote_id,
    quote_version_id,
    section_id,
    line_type,
    source_type,
    manufacturer,
    part_number,
    description,
    uom,
    quantity,
    unit_material_cost,
    labor_hours_per_unit,
    labor_rate,
    unit_other_cost,
    unit_sell,
    sort_order
  )
  values (
    org_id,
    quote_id_input,
    current_version,
    section_id_input,
    normalized_line_type,
    'manual',
    nullif(btrim(manufacturer_input), ''),
    nullif(btrim(part_number_input), ''),
    btrim(description_input),
    upper(coalesce(nullif(btrim(uom_input), ''), 'EA')),
    greatest(coalesce(quantity_input, 0), 0),
    greatest(coalesce(unit_material_cost_input, 0), 0),
    greatest(coalesce(labor_hours_per_unit_input, 0), 0),
    greatest(coalesce(labor_rate_input, 0), 0),
    greatest(coalesce(unit_other_cost_input, 0), 0),
    greatest(coalesce(unit_sell_input, 0), 0),
    next_sort
  )
  returning id into new_line_id;

  insert into public.quantity_contributions (
    organization_id,
    quote_id,
    quote_version_id,
    estimate_line_id,
    source_type,
    label,
    quantity,
    uom
  )
  values (
    org_id,
    quote_id_input,
    current_version,
    new_line_id,
    'manual',
    'Estimator Manual',
    greatest(coalesce(quantity_input, 0), 0),
    upper(coalesce(nullif(btrim(uom_input), ''), 'EA'))
  );

  return new_line_id;
end;
$$;

create or replace function public.update_manual_estimate_line(
  quote_id_input uuid,
  line_id_input uuid,
  quantity_input numeric,
  unit_material_cost_input numeric,
  labor_hours_per_unit_input numeric,
  labor_rate_input numeric,
  unit_other_cost_input numeric,
  unit_sell_input numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  current_version uuid;
  line_source public.estimate_source_type;
begin
  select q.organization_id, q.current_version_id
  into org_id, current_version
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or current_version is null then
    raise exception 'Quote not found';
  end if;

  if not (select private.can_access_quote(quote_id_input))
     or not (select private.has_permission(org_id, 'quotes.edit')) then
    raise exception 'Permission denied';
  end if;

  perform private.assert_quote_version_is_draft(current_version);

  select el.source_type
  into line_source
  from public.estimate_lines el
  where el.id = line_id_input
    and el.quote_id = quote_id_input
    and el.quote_version_id = current_version;

  if line_source is null then
    raise exception 'Estimate line not found';
  end if;

  -- Batch 4 editor is specifically for manual lines. Catalog/rule lines later
  -- receive source-specific edit behavior so their traceability is not broken.
  if line_source <> 'manual'::public.estimate_source_type then
    raise exception 'This line is controlled by its source and cannot be edited as a manual line';
  end if;

  update public.estimate_lines
  set
    quantity = greatest(coalesce(quantity_input, 0), 0),
    unit_material_cost = greatest(coalesce(unit_material_cost_input, 0), 0),
    labor_hours_per_unit = greatest(coalesce(labor_hours_per_unit_input, 0), 0),
    labor_rate = greatest(coalesce(labor_rate_input, 0), 0),
    unit_other_cost = greatest(coalesce(unit_other_cost_input, 0), 0),
    unit_sell = greatest(coalesce(unit_sell_input, 0), 0)
  where id = line_id_input;

  update public.quantity_contributions
  set quantity = greatest(coalesce(quantity_input, 0), 0)
  where estimate_line_id = line_id_input
    and source_type = 'manual'
    and label = 'Estimator Manual';
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalize current version
-- ---------------------------------------------------------------------------

create or replace function public.finalize_current_quote_version(
  quote_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  current_version uuid;
begin
  select q.organization_id, q.current_version_id
  into org_id, current_version
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or current_version is null then
    raise exception 'Quote not found';
  end if;

  if not (select private.can_access_quote(quote_id_input))
     or not (select private.has_permission(org_id, 'quotes.edit')) then
    raise exception 'Permission denied';
  end if;

  perform private.assert_quote_version_is_draft(current_version);
  perform private.recalculate_quote_version_totals(current_version);

  update public.quote_versions
  set
    status = 'finalized',
    finalized_at = now()
  where id = current_version;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    details
  )
  select
    org_id,
    (select auth.uid()),
    'quote_version',
    qv.id,
    'quote_version.finalized',
    jsonb_build_object('version', qv.display_version)
  from public.quote_versions qv
  where qv.id = current_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create revision and copy estimate snapshot
-- ---------------------------------------------------------------------------

create or replace function public.create_quote_revision(
  quote_id_input uuid,
  revision_type_input text,
  revision_reason_input text,
  revision_notes_input text default null,
  pricing_action_input text default 'keep_previous'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  old_version_id uuid;
  old_major integer;
  old_minor integer;
  new_major integer;
  new_minor integer;
  new_version_id uuid;
  old_section record;
  new_section_id uuid;
  old_line record;
  new_line_id uuid;
begin
  select q.organization_id, q.current_version_id
  into org_id, old_version_id
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or old_version_id is null then
    raise exception 'Quote not found';
  end if;

  if not (select private.can_access_quote(quote_id_input))
     or not (select private.has_permission(org_id, 'quotes.edit')) then
    raise exception 'Permission denied';
  end if;

  select version_major, version_minor
  into old_major, old_minor
  from public.quote_versions
  where id = old_version_id;

  if revision_type_input = 'change_order' then
    new_major := old_major + 1;
    new_minor := 0;
  else
    new_major := old_major;
    new_minor := old_minor + 1;
  end if;

  -- Preserve the former current version. A draft can be superseded by an
  -- explicit revision, but becomes archived before copy to enforce immutability.
  update public.quote_versions
  set status = 'archived'
  where id = old_version_id
    and status = 'draft';

  insert into public.quote_versions (
    organization_id,
    quote_id,
    version_major,
    version_minor,
    status,
    revision_reason,
    revision_notes,
    material_cost,
    labor_cost,
    other_cost,
    sell_price,
    negotiated_adjustment,
    pricing_snapshot,
    labor_snapshot,
    created_from_version_id,
    created_by_user_id
  )
  select
    organization_id,
    quote_id,
    new_major,
    new_minor,
    'draft',
    coalesce(nullif(btrim(revision_reason_input), ''), 'Other'),
    nullif(btrim(revision_notes_input), ''),
    material_cost,
    labor_cost,
    other_cost,
    sell_price,
    negotiated_adjustment,
    pricing_snapshot || jsonb_build_object('revision_pricing_action', pricing_action_input),
    labor_snapshot,
    id,
    (select auth.uid())
  from public.quote_versions
  where id = old_version_id
  returning id into new_version_id;

  for old_section in
    select *
    from public.estimate_sections
    where quote_version_id = old_version_id
    order by sort_order, created_at
  loop
    insert into public.estimate_sections (
      organization_id,
      quote_id,
      quote_version_id,
      name,
      sort_order
    )
    values (
      old_section.organization_id,
      old_section.quote_id,
      new_version_id,
      old_section.name,
      old_section.sort_order
    )
    returning id into new_section_id;

    for old_line in
      select *
      from public.estimate_lines
      where quote_version_id = old_version_id
        and section_id = old_section.id
      order by sort_order, created_at
    loop
      insert into public.estimate_lines (
        organization_id,
        quote_id,
        quote_version_id,
        section_id,
        line_type,
        source_type,
        source_id,
        manufacturer,
        part_number,
        description,
        uom,
        quantity,
        unit_material_cost,
        labor_hours_per_unit,
        labor_rate,
        unit_other_cost,
        unit_sell,
        sort_order
      )
      values (
        old_line.organization_id,
        old_line.quote_id,
        new_version_id,
        new_section_id,
        old_line.line_type,
        old_line.source_type,
        old_line.source_id,
        old_line.manufacturer,
        old_line.part_number,
        old_line.description,
        old_line.uom,
        old_line.quantity,
        old_line.unit_material_cost,
        old_line.labor_hours_per_unit,
        old_line.labor_rate,
        old_line.unit_other_cost,
        old_line.unit_sell,
        old_line.sort_order
      )
      returning id into new_line_id;

      insert into public.quantity_contributions (
        organization_id,
        quote_id,
        quote_version_id,
        estimate_line_id,
        source_type,
        source_id,
        label,
        quantity,
        uom
      )
      select
        qc.organization_id,
        qc.quote_id,
        new_version_id,
        new_line_id,
        qc.source_type,
        qc.source_id,
        qc.label,
        qc.quantity,
        qc.uom
      from public.quantity_contributions qc
      where qc.estimate_line_id = old_line.id;
    end loop;
  end loop;

  update public.quotes
  set
    current_version_id = new_version_id,
    status = 'draft'
  where id = quote_id_input;

  perform private.recalculate_quote_version_totals(new_version_id);

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
    'quote_version',
    new_version_id,
    case
      when revision_type_input = 'change_order'
        then 'quote_version.change_order_created'
      else 'quote_version.revision_created'
    end,
    jsonb_build_object(
      'quote_id', quote_id_input,
      'version_major', new_major,
      'version_minor', new_minor,
      'reason', revision_reason_input,
      'pricing_action', pricing_action_input
    )
  );

  return new_version_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.estimate_sections enable row level security;
alter table public.estimate_lines enable row level security;
alter table public.quantity_contributions enable row level security;

drop policy if exists estimate_sections_select on public.estimate_sections;
create policy estimate_sections_select
on public.estimate_sections
for select
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.view'))
);

drop policy if exists estimate_sections_insert on public.estimate_sections;
create policy estimate_sections_insert
on public.estimate_sections
for insert
to authenticated
with check (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists estimate_sections_update on public.estimate_sections;
create policy estimate_sections_update
on public.estimate_sections
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

drop policy if exists estimate_sections_delete on public.estimate_sections;
create policy estimate_sections_delete
on public.estimate_sections
for delete
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists estimate_lines_select on public.estimate_lines;
create policy estimate_lines_select
on public.estimate_lines
for select
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.view'))
);

drop policy if exists estimate_lines_insert on public.estimate_lines;
create policy estimate_lines_insert
on public.estimate_lines
for insert
to authenticated
with check (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists estimate_lines_update on public.estimate_lines;
create policy estimate_lines_update
on public.estimate_lines
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

drop policy if exists estimate_lines_delete on public.estimate_lines;
create policy estimate_lines_delete
on public.estimate_lines
for delete
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists quantity_contributions_select on public.quantity_contributions;
create policy quantity_contributions_select
on public.quantity_contributions
for select
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.view'))
);

drop policy if exists quantity_contributions_insert on public.quantity_contributions;
create policy quantity_contributions_insert
on public.quantity_contributions
for insert
to authenticated
with check (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

drop policy if exists quantity_contributions_update on public.quantity_contributions;
create policy quantity_contributions_update
on public.quantity_contributions
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

drop policy if exists quantity_contributions_delete on public.quantity_contributions;
create policy quantity_contributions_delete
on public.quantity_contributions
for delete
to authenticated
using (
  (select private.can_access_quote(quote_id))
  and (select private.has_permission(organization_id, 'quotes.edit'))
);

grant select, insert, update, delete on public.estimate_sections to authenticated;
grant select, insert, update, delete on public.estimate_lines to authenticated;
grant select, insert, update, delete on public.quantity_contributions to authenticated;

revoke all on function public.add_estimate_section(uuid, text) from public;
grant execute on function public.add_estimate_section(uuid, text) to authenticated;

revoke all on function public.add_manual_estimate_line(
  uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric
) from public;
grant execute on function public.add_manual_estimate_line(
  uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, numeric, numeric
) to authenticated;

revoke all on function public.update_manual_estimate_line(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric
) from public;
grant execute on function public.update_manual_estimate_line(
  uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric
) to authenticated;

revoke all on function public.finalize_current_quote_version(uuid) from public;
grant execute on function public.finalize_current_quote_version(uuid) to authenticated;

revoke all on function public.create_quote_revision(uuid, text, text, text, text) from public;
grant execute on function public.create_quote_revision(uuid, text, text, text, text) to authenticated;

commit;
