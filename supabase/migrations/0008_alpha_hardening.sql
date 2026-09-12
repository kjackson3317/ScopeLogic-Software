begin;

update public.organization_module_entitlements
set enabled=true
where module_key in('core','quote','rules');

update public.organization_module_entitlements
set enabled=false
where module_key in(
  'scope_review','bid_analysis','takeoff',
  'integration_salesforce','integration_vendor_pricing','intelligence'
);

create index if not exists quotes_org_status_idx
  on public.quotes(organization_id,status,updated_at desc);

create index if not exists quote_versions_lookup_idx
  on public.quote_versions(quote_id,version_major desc,version_minor desc);

create index if not exists quantity_inputs_version_idx
  on public.quantity_inputs(quote_version_id,input_key);

create index if not exists rule_results_version_status_idx
  on public.rule_results(quote_version_id,status);

create index if not exists documents_project_status_idx
  on public.documents(project_id,status,updated_at desc);

create or replace function private.validate_quote_current_version()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.current_version_id is not null and not exists(
   select 1 from public.quote_versions qv
   where qv.id=new.current_version_id and qv.quote_id=new.id
 ) then
   raise exception 'Current Quote Version must belong to the same Quote';
 end if;
 return new;
end$$;

drop trigger if exists validate_quote_current_version on public.quotes;
create trigger validate_quote_current_version
before insert or update of current_version_id on public.quotes
for each row execute function private.validate_quote_current_version();

create or replace function private.validate_estimate_line_section()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if not exists(
   select 1 from public.estimate_sections es
   where es.id=new.section_id
     and es.quote_id=new.quote_id
     and es.quote_version_id=new.quote_version_id
 ) then
   raise exception 'Estimate line section must belong to the same Quote Version';
 end if;
 return new;
end$$;

drop trigger if exists validate_estimate_line_section on public.estimate_lines;
create trigger validate_estimate_line_section
before insert or update on public.estimate_lines
for each row execute function private.validate_estimate_line_section();

commit;
