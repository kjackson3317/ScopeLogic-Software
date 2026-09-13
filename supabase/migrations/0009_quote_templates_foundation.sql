-- ScopeLogic Software Alpha 1 — Live Quote Parity 1
-- Normalized company Quote Templates foundation.
-- APPLY ONLY TO THE ISOLATED SCOPELOGIC SOFTWARE ALPHA PROJECT.

-- Add the source type in its own committed statement before the transaction below.
alter type public.estimate_source_type add value if not exists 'template';

begin;

create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trade_scope text,
  default_material_markup numeric(12,6) not null default 1.20 check(default_material_markup >= 0),
  active boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name)
);

create index if not exists quote_templates_org_name_idx
  on public.quote_templates(organization_id, name);

create table if not exists public.quote_template_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_template_id uuid not null references public.quote_templates(id) on delete cascade,
  name text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique(quote_template_id, name)
);

create index if not exists quote_template_sections_template_idx
  on public.quote_template_sections(quote_template_id, sort_order);

create table if not exists public.quote_template_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_template_id uuid not null references public.quote_templates(id) on delete cascade,
  section_id uuid not null references public.quote_template_sections(id) on delete cascade,
  line_type public.estimate_line_type not null default 'material',
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  manufacturer text,
  part_number text,
  description text not null,
  uom text not null default 'EA',
  quantity numeric(16,4) not null default 1 check(quantity >= 0),
  unit_material_cost numeric(16,4) not null default 0 check(unit_material_cost >= 0),
  labor_hours_per_unit numeric(16,4) not null default 0 check(labor_hours_per_unit >= 0),
  labor_rate numeric(16,4) not null default 0 check(labor_rate >= 0),
  unit_other_cost numeric(16,4) not null default 0 check(unit_other_cost >= 0),
  unit_sell numeric(16,4) not null default 0 check(unit_sell >= 0),
  show_on_bom boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_template_lines_template_idx
  on public.quote_template_lines(quote_template_id, section_id, sort_order);

-- Keep template timestamps current.
drop trigger if exists touch_quote_templates_updated_at on public.quote_templates;
create trigger touch_quote_templates_updated_at
before update on public.quote_templates
for each row execute function private.touch_updated_at();

drop trigger if exists touch_quote_template_lines_updated_at on public.quote_template_lines;
create trigger touch_quote_template_lines_updated_at
before update on public.quote_template_lines
for each row execute function private.touch_updated_at();

-- Tenant isolation. Template library is company-wide, not project-assignment scoped.
alter table public.quote_templates enable row level security;
alter table public.quote_template_sections enable row level security;
alter table public.quote_template_lines enable row level security;

drop policy if exists quote_templates_select on public.quote_templates;
create policy quote_templates_select
on public.quote_templates for select to authenticated
using (private.is_active_org_member(organization_id));

drop policy if exists quote_template_sections_select on public.quote_template_sections;
create policy quote_template_sections_select
on public.quote_template_sections for select to authenticated
using (private.is_active_org_member(organization_id));

drop policy if exists quote_template_lines_select on public.quote_template_lines;
create policy quote_template_lines_select
on public.quote_template_lines for select to authenticated
using (private.is_active_org_member(organization_id));

-- Direct table writes remain closed. Mutations go through permission-checked RPCs.
revoke insert, update, delete on public.quote_templates from authenticated;
revoke insert, update, delete on public.quote_template_sections from authenticated;
revoke insert, update, delete on public.quote_template_lines from authenticated;
grant select on public.quote_templates, public.quote_template_sections, public.quote_template_lines to authenticated;

create or replace function public.create_quote_template_v1(
  template_name_input text,
  description_input text default null,
  trade_scope_input text default null,
  default_material_markup_input numeric default 1.20
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  new_template_id uuid;
  new_section_id uuid;
begin
  org_id := private.current_organization_id();
  if org_id is null then raise exception 'Active organization membership required'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;
  if template_name_input is null or btrim(template_name_input) = '' then raise exception 'Template name is required'; end if;

  insert into public.quote_templates(
    organization_id, name, description, trade_scope, default_material_markup, created_by_user_id
  ) values (
    org_id,
    btrim(template_name_input),
    nullif(btrim(description_input), ''),
    nullif(btrim(trade_scope_input), ''),
    greatest(coalesce(default_material_markup_input, 1.20), 0),
    auth.uid()
  ) returning id into new_template_id;

  insert into public.quote_template_sections(
    organization_id, quote_template_id, name, sort_order
  ) values (org_id, new_template_id, 'Base Estimate', 100)
  returning id into new_section_id;

  insert into public.audit_events(
    organization_id, actor_user_id, entity_type, entity_id, action, details
  ) values (
    org_id, auth.uid(), 'quote_template', new_template_id, 'quote_template.created',
    jsonb_build_object('name', btrim(template_name_input), 'default_section_id', new_section_id)
  );

  return new_template_id;
end;
$$;

create or replace function public.update_quote_template_v1(
  template_id_input uuid,
  template_name_input text,
  description_input text default null,
  trade_scope_input text default null,
  default_material_markup_input numeric default 1.20,
  active_input boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
begin
  select organization_id into org_id
  from public.quote_templates where id = template_id_input;

  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Quote Template not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;
  if template_name_input is null or btrim(template_name_input) = '' then raise exception 'Template name is required'; end if;

  update public.quote_templates
  set name = btrim(template_name_input),
      description = nullif(btrim(description_input), ''),
      trade_scope = nullif(btrim(trade_scope_input), ''),
      default_material_markup = greatest(coalesce(default_material_markup_input, 1.20), 0),
      active = coalesce(active_input, true)
  where id = template_id_input;
end;
$$;

create or replace function public.delete_quote_template_v1(template_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  template_name text;
begin
  select organization_id, name into org_id, template_name
  from public.quote_templates where id = template_id_input;

  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Quote Template not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;

  delete from public.quote_templates where id = template_id_input;

  insert into public.audit_events(
    organization_id, actor_user_id, entity_type, entity_id, action, details
  ) values (
    org_id, auth.uid(), 'quote_template', template_id_input, 'quote_template.deleted',
    jsonb_build_object('name', template_name)
  );
end;
$$;

create or replace function public.add_quote_template_section_v1(
  template_id_input uuid,
  section_name_input text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  next_sort integer;
  new_section_id uuid;
begin
  select organization_id into org_id from public.quote_templates where id = template_id_input;
  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Quote Template not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;
  if section_name_input is null or btrim(section_name_input) = '' then raise exception 'Section name is required'; end if;

  select coalesce(max(sort_order), 0) + 100 into next_sort
  from public.quote_template_sections where quote_template_id = template_id_input;

  insert into public.quote_template_sections(organization_id, quote_template_id, name, sort_order)
  values(org_id, template_id_input, btrim(section_name_input), next_sort)
  returning id into new_section_id;

  return new_section_id;
end;
$$;

create or replace function public.add_quote_template_line_v1(
  template_id_input uuid,
  section_id_input uuid,
  line_type_input text,
  catalog_item_id_input uuid,
  manufacturer_input text,
  part_number_input text,
  description_input text,
  uom_input text,
  quantity_input numeric,
  unit_material_cost_input numeric,
  labor_hours_per_unit_input numeric,
  labor_rate_input numeric,
  unit_other_cost_input numeric,
  unit_sell_input numeric,
  show_on_bom_input boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  normalized_type public.estimate_line_type;
  next_sort integer;
  new_line_id uuid;
begin
  select organization_id into org_id from public.quote_templates where id = template_id_input;
  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Quote Template not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;

  if not exists(
    select 1 from public.quote_template_sections
    where id = section_id_input and quote_template_id = template_id_input and organization_id = org_id
  ) then raise exception 'Template section not found'; end if;

  if catalog_item_id_input is not null and not exists(
    select 1 from public.catalog_items
    where id = catalog_item_id_input and organization_id = org_id
  ) then raise exception 'Catalog item is not available in this organization'; end if;

  if description_input is null or btrim(description_input) = '' then raise exception 'Description is required'; end if;
  begin normalized_type := line_type_input::public.estimate_line_type;
  exception when others then normalized_type := 'material'::public.estimate_line_type; end;

  select coalesce(max(sort_order), 0) + 100 into next_sort
  from public.quote_template_lines where section_id = section_id_input;

  insert into public.quote_template_lines(
    organization_id, quote_template_id, section_id, line_type, catalog_item_id,
    manufacturer, part_number, description, uom, quantity, unit_material_cost,
    labor_hours_per_unit, labor_rate, unit_other_cost, unit_sell, show_on_bom, sort_order
  ) values (
    org_id, template_id_input, section_id_input, normalized_type, catalog_item_id_input,
    nullif(btrim(manufacturer_input), ''), nullif(btrim(part_number_input), ''), btrim(description_input),
    upper(coalesce(nullif(btrim(uom_input), ''), 'EA')),
    greatest(coalesce(quantity_input, 0), 0), greatest(coalesce(unit_material_cost_input, 0), 0),
    greatest(coalesce(labor_hours_per_unit_input, 0), 0), greatest(coalesce(labor_rate_input, 0), 0),
    greatest(coalesce(unit_other_cost_input, 0), 0), greatest(coalesce(unit_sell_input, 0), 0),
    coalesce(show_on_bom_input, true), next_sort
  ) returning id into new_line_id;

  return new_line_id;
end;
$$;

create or replace function public.update_quote_template_line_v1(
  line_id_input uuid,
  section_id_input uuid,
  quantity_input numeric,
  unit_material_cost_input numeric,
  labor_hours_per_unit_input numeric,
  labor_rate_input numeric,
  unit_other_cost_input numeric,
  unit_sell_input numeric,
  show_on_bom_input boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  template_id uuid;
begin
  select organization_id, quote_template_id into org_id, template_id
  from public.quote_template_lines where id = line_id_input;

  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Template line not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;
  if not exists(
    select 1 from public.quote_template_sections
    where id = section_id_input and quote_template_id = template_id and organization_id = org_id
  ) then raise exception 'Template section not found'; end if;

  update public.quote_template_lines
  set section_id = section_id_input,
      quantity = greatest(coalesce(quantity_input, 0), 0),
      unit_material_cost = greatest(coalesce(unit_material_cost_input, 0), 0),
      labor_hours_per_unit = greatest(coalesce(labor_hours_per_unit_input, 0), 0),
      labor_rate = greatest(coalesce(labor_rate_input, 0), 0),
      unit_other_cost = greatest(coalesce(unit_other_cost_input, 0), 0),
      unit_sell = greatest(coalesce(unit_sell_input, 0), 0),
      show_on_bom = coalesce(show_on_bom_input, true)
  where id = line_id_input;
end;
$$;

create or replace function public.delete_quote_template_line_v1(line_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
begin
  select organization_id into org_id from public.quote_template_lines where id = line_id_input;
  if org_id is null or not private.is_active_org_member(org_id) then raise exception 'Template line not found'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;
  delete from public.quote_template_lines where id = line_id_input;
end;
$$;

revoke all on function public.create_quote_template_v1(text,text,text,numeric) from public;
revoke all on function public.update_quote_template_v1(uuid,text,text,text,numeric,boolean) from public;
revoke all on function public.delete_quote_template_v1(uuid) from public;
revoke all on function public.add_quote_template_section_v1(uuid,text) from public;
revoke all on function public.add_quote_template_line_v1(uuid,uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean) from public;
revoke all on function public.update_quote_template_line_v1(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,boolean) from public;
revoke all on function public.delete_quote_template_line_v1(uuid) from public;

grant execute on function public.create_quote_template_v1(text,text,text,numeric) to authenticated;
grant execute on function public.update_quote_template_v1(uuid,text,text,text,numeric,boolean) to authenticated;
grant execute on function public.delete_quote_template_v1(uuid) to authenticated;
grant execute on function public.add_quote_template_section_v1(uuid,text) to authenticated;
grant execute on function public.add_quote_template_line_v1(uuid,uuid,text,uuid,text,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,boolean) to authenticated;
grant execute on function public.update_quote_template_line_v1(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,boolean) to authenticated;
grant execute on function public.delete_quote_template_line_v1(uuid) to authenticated;

commit;
