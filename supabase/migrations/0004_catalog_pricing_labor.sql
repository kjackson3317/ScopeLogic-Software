begin;

do $$
begin
  if not exists (select 1 from pg_type where typname='catalog_item_type') then
    create type public.catalog_item_type as enum ('material','equipment','labor','subcontract','service','rental','allowance','fee','misc');
  end if;
  if not exists (select 1 from pg_type where typname='assembly_status') then
    create type public.assembly_status as enum ('draft','published','retired');
  end if;
end$$;

create table if not exists public.suppliers(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id,name)
);

create table if not exists public.catalog_items(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_type public.catalog_item_type not null default 'material',
  manufacturer text,
  part_number text,
  description text not null,
  category text,
  uom text not null default 'EA',
  approved_cost numeric(16,4) not null default 0 check(approved_cost>=0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_prices(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  unit_cost numeric(16,4) not null check(unit_cost>=0),
  uom text not null,
  effective_at timestamptz not null default now(),
  valid_through date,
  source_label text,
  source_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_policies(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  policy_type text not null default 'approved_cost',
  configuration jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  active boolean not null default true,
  unique(organization_id,name)
);

create table if not exists public.project_pricing(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  vendor_quote_ref text,
  unit_cost numeric(16,4) not null check(unit_cost>=0),
  min_quantity numeric(16,4),
  valid_through date,
  notes text,
  status text not null default 'approved' check(status in ('pending','approved','rejected','expired')),
  entered_by_user_id uuid references auth.users(id) on delete set null,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.labor_classes(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  unique(organization_id,name)
);

create table if not exists public.labor_schedules(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  is_default boolean not null default false,
  unique(organization_id,name)
);

create table if not exists public.labor_schedule_rates(
  schedule_id uuid not null references public.labor_schedules(id) on delete cascade,
  labor_class_id uuid not null references public.labor_classes(id) on delete cascade,
  cost_rate numeric(16,4) not null default 0 check(cost_rate>=0),
  sell_rate numeric(16,4) not null default 0 check(sell_rate>=0),
  primary key(schedule_id,labor_class_id)
);

create table if not exists public.assemblies(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  status public.assembly_status not null default 'draft',
  version text not null default '1.0',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,name,version)
);

create table if not exists public.assembly_components(
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete restrict,
  labor_class_id uuid references public.labor_classes(id) on delete restrict,
  quantity_formula text not null default '1',
  sort_order integer not null default 100,
  check(catalog_item_id is not null or labor_class_id is not null)
);

alter table public.projects add column if not exists labor_schedule_id uuid references public.labor_schedules(id) on delete set null;
alter table public.estimate_lines add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;
alter table public.estimate_lines add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.estimate_lines add column if not exists project_pricing_id uuid references public.project_pricing(id) on delete set null;
alter table public.estimate_lines add column if not exists price_source_label text;

insert into public.pricing_policies(organization_id,name,policy_type,is_default)
select o.id,'Company Approved Cost','approved_cost',true
from public.organizations o
where not exists(select 1 from public.pricing_policies p where p.organization_id=o.id and p.is_default);

alter table public.suppliers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.supplier_prices enable row level security;
alter table public.pricing_policies enable row level security;
alter table public.project_pricing enable row level security;
alter table public.labor_classes enable row level security;
alter table public.labor_schedules enable row level security;
alter table public.labor_schedule_rates enable row level security;
alter table public.assemblies enable row level security;
alter table public.assembly_components enable row level security;

create policy suppliers_select on public.suppliers for select to authenticated using(private.is_active_org_member(organization_id));
create policy catalog_items_select on public.catalog_items for select to authenticated using(private.is_active_org_member(organization_id));
create policy supplier_prices_select on public.supplier_prices for select to authenticated using(private.is_active_org_member(organization_id));
create policy pricing_policies_select on public.pricing_policies for select to authenticated using(private.is_active_org_member(organization_id));
create policy project_pricing_select on public.project_pricing for select to authenticated using(private.is_active_org_member(organization_id));
create policy labor_classes_select on public.labor_classes for select to authenticated using(private.is_active_org_member(organization_id));
create policy labor_schedules_select on public.labor_schedules for select to authenticated using(private.is_active_org_member(organization_id));
create policy labor_schedule_rates_select on public.labor_schedule_rates for select to authenticated using (
  exists(select 1 from public.labor_schedules s where s.id=schedule_id and private.is_active_org_member(s.organization_id))
);
create policy assemblies_select on public.assemblies for select to authenticated using(private.is_active_org_member(organization_id));
create policy assembly_components_select on public.assembly_components for select to authenticated using (
  exists(select 1 from public.assemblies a where a.id=assembly_id and private.is_active_org_member(a.organization_id))
);

grant select,insert,update,delete on public.suppliers,public.catalog_items,public.supplier_prices,public.pricing_policies,public.project_pricing,public.labor_classes,public.labor_schedules,public.labor_schedule_rates,public.assemblies,public.assembly_components to authenticated;


create or replace function public.create_catalog_item_v1(
 item_type_input text,manufacturer_input text,part_number_input text,description_input text,
 category_input text,uom_input text,approved_cost_input numeric
) returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;new_id uuid;normalized public.catalog_item_type;
begin
 org_id:=private.current_organization_id();
 if org_id is null or not private.has_permission(org_id,'organization.manage') then raise exception 'Permission denied'; end if;
 begin normalized:=item_type_input::public.catalog_item_type; exception when others then normalized:='material'; end;
 insert into public.catalog_items(organization_id,item_type,manufacturer,part_number,description,category,uom,approved_cost)
 values(org_id,normalized,nullif(btrim(manufacturer_input),''),nullif(btrim(part_number_input),''),btrim(description_input),nullif(btrim(category_input),''),upper(coalesce(nullif(btrim(uom_input),''),'EA')),greatest(coalesce(approved_cost_input,0),0))
 returning id into new_id;
 return new_id;
end$$;

create or replace function public.create_supplier_v1(supplier_name_input text,supplier_code_input text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;new_id uuid;
begin
 org_id:=private.current_organization_id();
 if org_id is null or not private.has_permission(org_id,'organization.manage') then raise exception 'Permission denied'; end if;
 insert into public.suppliers(organization_id,name,code) values(org_id,btrim(supplier_name_input),nullif(btrim(supplier_code_input),'')) returning id into new_id;
 return new_id;
end$$;

grant execute on function public.create_catalog_item_v1(text,text,text,text,text,text,numeric) to authenticated;
grant execute on function public.create_supplier_v1(text,text) to authenticated;

commit;
