begin;

create table if not exists public.organization_branding(
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 company_display_name text,
 primary_color text not null default '#4B6623',
 secondary_color text not null default '#3D5320',
 accent_color text not null default '#1F2937',
 logo_storage_path text,alternate_logo_storage_path text,
 address_text text,phone text,website text,license_text text,footer_text text,terms_text text,
 updated_at timestamptz not null default now()
);

create table if not exists public.proposal_profiles(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null,
 show_bom boolean not null default true,
 show_manufacturer boolean not null default true,
 show_part_number boolean not null default true,
 show_quantity boolean not null default true,
 show_unit_sell boolean not null default false,
 show_labor boolean not null default false,
 show_alternates boolean not null default true,
 show_allowances boolean not null default true,
 show_negotiated_adjustment boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(organization_id,name)
);

create table if not exists public.quote_scope_content(
 quote_version_id uuid primary key references public.quote_versions(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 quote_id uuid not null references public.quotes(id) on delete cascade,
 scope_text text not null default '',inclusions text not null default '',exclusions text not null default '',
 assumptions text not null default '',clarifications text not null default '',
 updated_at timestamptz not null default now()
);

create table if not exists public.proposal_packages(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 name text not null,
 proposal_profile_id uuid references public.proposal_profiles(id) on delete set null,
 status text not null default 'draft' check(status in('draft','issued','archived')),
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.proposal_package_quotes(
 proposal_package_id uuid not null references public.proposal_packages(id) on delete cascade,
 quote_id uuid not null references public.quotes(id) on delete restrict,
 quote_version_id uuid not null references public.quote_versions(id) on delete restrict,
 primary key(proposal_package_id,quote_id)
);

create table if not exists public.proposal_issues(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 proposal_package_id uuid references public.proposal_packages(id) on delete set null,
 quote_id uuid references public.quotes(id) on delete set null,
 quote_version_id uuid references public.quote_versions(id) on delete set null,
 issued_by_user_id uuid references auth.users(id) on delete set null,
 recipient_text text,snapshot_storage_path text,
 issued_at timestamptz not null default now()
);

insert into public.organization_branding(organization_id,company_display_name)
select id,name from public.organizations on conflict(organization_id) do nothing;

insert into public.proposal_profiles(
 organization_id,name,show_bom,show_manufacturer,show_part_number,show_quantity,show_unit_sell,show_labor
)
select id,'Detailed BOM – Qty Only',true,true,true,true,false,false
from public.organizations o
where not exists(select 1 from public.proposal_profiles pp where pp.organization_id=o.id);

create or replace function public.upsert_quote_scope(
 quote_id_input uuid,scope_text_input text,inclusions_input text,exclusions_input text,
 assumptions_input text,clarifications_input text
) returns void language plpgsql security definer set search_path=''
as $$
declare org_id uuid;version_id uuid;
begin
 select organization_id,current_version_id into org_id,version_id from public.quotes where id=quote_id_input;
 if org_id is null or not private.can_access_quote(quote_id_input) or not private.has_permission(org_id,'quotes.edit') then
  raise exception 'Permission denied';
 end if;
 perform private.assert_quote_version_is_draft(version_id);
 insert into public.quote_scope_content(
  quote_version_id,organization_id,quote_id,scope_text,inclusions,exclusions,assumptions,clarifications
 ) values(
  version_id,org_id,quote_id_input,coalesce(scope_text_input,''),coalesce(inclusions_input,''),
  coalesce(exclusions_input,''),coalesce(assumptions_input,''),coalesce(clarifications_input,'')
 )
 on conflict(quote_version_id) do update set
  scope_text=excluded.scope_text,inclusions=excluded.inclusions,exclusions=excluded.exclusions,
  assumptions=excluded.assumptions,clarifications=excluded.clarifications,updated_at=now();
end$$;

alter table public.organization_branding enable row level security;
alter table public.proposal_profiles enable row level security;
alter table public.quote_scope_content enable row level security;
alter table public.proposal_packages enable row level security;
alter table public.proposal_package_quotes enable row level security;
alter table public.proposal_issues enable row level security;

create policy branding_select on public.organization_branding for select to authenticated using(private.is_active_org_member(organization_id));
create policy proposal_profiles_select on public.proposal_profiles for select to authenticated using(private.is_active_org_member(organization_id));
create policy quote_scope_select on public.quote_scope_content for select to authenticated using(private.can_access_quote(quote_id));
create policy proposal_packages_select on public.proposal_packages for select to authenticated using(private.can_access_project(project_id));
create policy proposal_package_quotes_select on public.proposal_package_quotes for select to authenticated using(
 exists(select 1 from public.proposal_packages p where p.id=proposal_package_id and private.can_access_project(p.project_id))
);
create policy proposal_issues_select on public.proposal_issues for select to authenticated using(private.is_active_org_member(organization_id));

grant select,insert,update,delete on public.organization_branding,public.proposal_profiles,public.quote_scope_content,public.proposal_packages,public.proposal_package_quotes,public.proposal_issues to authenticated;
grant execute on function public.upsert_quote_scope(uuid,text,text,text,text,text) to authenticated;

commit;
