begin;

do $$
begin
 if not exists(select 1 from pg_type where typname='rule_status') then create type public.rule_status as enum('draft','published','retired'); end if;
 if not exists(select 1 from pg_type where typname='rule_behavior') then create type public.rule_behavior as enum('calculate_only','recommend_bom','auto_apply'); end if;
end$$;

create table if not exists public.rules(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, category text, status public.rule_status not null default 'draft',
 current_version_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,name)
);

create table if not exists public.rule_versions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 rule_id uuid not null references public.rules(id) on delete cascade,
 version integer not null default 1,
 input_key text not null,input_label text not null,
 factor numeric(16,6) not null default 1,
 waste_percent numeric(12,6) not null default 0,
 behavior public.rule_behavior not null default 'calculate_only',
 output_label text not null,output_unit text not null,
 catalog_item_id uuid references public.catalog_items(id) on delete set null,
 tested boolean not null default false,
 created_at timestamptz not null default now(),
 unique(rule_id,version)
);
alter table public.rules add constraint rules_current_version_fk foreign key(current_version_id) references public.rule_versions(id) on delete set null;

create table if not exists public.quantity_inputs(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 quote_id uuid not null references public.quotes(id) on delete cascade,
 quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
 input_key text not null,label text not null,value numeric(18,6) not null default 0,unit text not null,
 source_type text not null default 'manual',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(quote_version_id,input_key,source_type)
);

create table if not exists public.rule_runs(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 quote_id uuid not null references public.quotes(id) on delete cascade,
 quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
 run_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.rule_results(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 rule_run_id uuid not null references public.rule_runs(id) on delete cascade,
 rule_id uuid not null references public.rules(id) on delete cascade,
 rule_version_id uuid not null references public.rule_versions(id) on delete restrict,
 quote_id uuid not null references public.quotes(id) on delete cascade,
 quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
 input_key text not null,input_value numeric(18,6) not null,
 output_label text not null,output_value numeric(18,6) not null,output_unit text not null,
 behavior public.rule_behavior not null,
 catalog_item_id uuid references public.catalog_items(id) on delete set null,
 status text not null default 'pending' check(status in('pending','accepted','ignored')),
 accepted_estimate_line_id uuid references public.estimate_lines(id) on delete set null,
 created_at timestamptz not null default now()
);

create or replace function public.create_rule_v1(
 rule_name_input text,category_input text,input_key_input text,input_label_input text,
 factor_input numeric,waste_percent_input numeric,behavior_input text,
 output_label_input text,output_unit_input text,catalog_item_id_input uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;rule_id uuid;rv_id uuid;beh public.rule_behavior;
begin
 org_id:=private.current_organization_id();
 if org_id is null or not private.has_permission(org_id,'rules.create') then raise exception 'Permission denied'; end if;
 begin beh:=behavior_input::public.rule_behavior; exception when others then beh:='calculate_only'; end;
 insert into public.rules(organization_id,name,category) values(org_id,btrim(rule_name_input),nullif(btrim(category_input),'')) returning id into rule_id;
 insert into public.rule_versions(organization_id,rule_id,input_key,input_label,factor,waste_percent,behavior,output_label,output_unit,catalog_item_id)
 values(org_id,rule_id,btrim(input_key_input),btrim(input_label_input),coalesce(factor_input,1),coalesce(waste_percent_input,0),beh,btrim(output_label_input),upper(coalesce(nullif(btrim(output_unit_input),''),'EA')),catalog_item_id_input)
 returning id into rv_id;
 update public.rules set current_version_id=rv_id where id=rule_id;
 return rule_id;
end$$;

create or replace function public.upsert_quantity_input(
 quote_id_input uuid,input_key_input text,label_input text,value_input numeric,unit_input text,source_type_input text
) returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;version_id uuid;new_id uuid;
begin
 select organization_id,current_version_id into org_id,version_id from public.quotes where id=quote_id_input;
 if org_id is null or not private.can_access_quote(quote_id_input) or not private.has_permission(org_id,'rules.use') then raise exception 'Permission denied'; end if;
 perform private.assert_quote_version_is_draft(version_id);
 insert into public.quantity_inputs(organization_id,quote_id,quote_version_id,input_key,label,value,unit,source_type)
 values(org_id,quote_id_input,version_id,btrim(input_key_input),btrim(label_input),coalesce(value_input,0),upper(coalesce(nullif(btrim(unit_input),''),'EA')),coalesce(nullif(btrim(source_type_input),''),'manual'))
 on conflict(quote_version_id,input_key,source_type) do update set label=excluded.label,value=excluded.value,unit=excluded.unit,updated_at=now()
 returning id into new_id;
 return new_id;
end$$;

create or replace function public.run_rules_for_quote(quote_id_input uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;version_id uuid;run_id uuid;rule_row record;input_row record;calculated numeric;
begin
 select organization_id,current_version_id into org_id,version_id from public.quotes where id=quote_id_input;
 if org_id is null or not private.can_access_quote(quote_id_input) or not private.has_permission(org_id,'rules.use') then raise exception 'Permission denied'; end if;
 perform private.assert_quote_version_is_draft(version_id);
 insert into public.rule_runs(organization_id,quote_id,quote_version_id,run_by_user_id) values(org_id,quote_id_input,version_id,auth.uid()) returning id into run_id;

 for rule_row in
   select r.id as rule_id,rv.* from public.rules r join public.rule_versions rv on rv.id=r.current_version_id
   where r.organization_id=org_id and r.status in('draft','published')
 loop
   select * into input_row from public.quantity_inputs
   where quote_version_id=version_id and input_key=rule_row.input_key
   order by updated_at desc limit 1;

   if input_row.id is not null then
     calculated:=input_row.value*rule_row.factor*(1+(rule_row.waste_percent/100.0));
     insert into public.rule_results(
       organization_id,rule_run_id,rule_id,rule_version_id,quote_id,quote_version_id,
       input_key,input_value,output_label,output_value,output_unit,behavior,catalog_item_id
     ) values(
       org_id,run_id,rule_row.rule_id,rule_row.id,quote_id_input,version_id,
       rule_row.input_key,input_row.value,rule_row.output_label,calculated,rule_row.output_unit,rule_row.behavior,rule_row.catalog_item_id
     );
   end if;
 end loop;
 return run_id;
end$$;

alter table public.rules enable row level security;
alter table public.rule_versions enable row level security;
alter table public.quantity_inputs enable row level security;
alter table public.rule_runs enable row level security;
alter table public.rule_results enable row level security;

create policy rules_select on public.rules for select to authenticated using(private.is_active_org_member(organization_id));
create policy rule_versions_select on public.rule_versions for select to authenticated using(private.is_active_org_member(organization_id));
create policy quantity_inputs_select on public.quantity_inputs for select to authenticated using(private.can_access_quote(quote_id));
create policy rule_runs_select on public.rule_runs for select to authenticated using(private.can_access_quote(quote_id));
create policy rule_results_select on public.rule_results for select to authenticated using(private.can_access_quote(quote_id));

grant select,insert,update,delete on public.rules,public.rule_versions,public.quantity_inputs,public.rule_runs,public.rule_results to authenticated;
grant execute on function public.create_rule_v1(text,text,text,text,numeric,numeric,text,text,text,uuid) to authenticated;
grant execute on function public.upsert_quantity_input(uuid,text,text,numeric,text,text) to authenticated;
grant execute on function public.run_rules_for_quote(uuid) to authenticated;


create or replace function public.accept_rule_result_to_bom(
 quote_id_input uuid,result_id_input uuid,section_id_input uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
 org_id uuid;version_id uuid;result_row record;item_row record;new_line uuid;next_sort integer;
begin
 select organization_id,current_version_id into org_id,version_id from public.quotes where id=quote_id_input;
 if org_id is null or not private.can_access_quote(quote_id_input) or not private.has_permission(org_id,'quotes.edit') then
   raise exception 'Permission denied';
 end if;
 perform private.assert_quote_version_is_draft(version_id);

 select * into result_row
 from public.rule_results
 where id=result_id_input and quote_id=quote_id_input and quote_version_id=version_id and status='pending';

 if result_row.id is null then raise exception 'Pending rule result not found'; end if;
 if result_row.behavior<>'recommend_bom' or result_row.catalog_item_id is null then
   raise exception 'Result is not a BOM recommendation';
 end if;
 if not exists(select 1 from public.estimate_sections where id=section_id_input and quote_version_id=version_id) then
   raise exception 'Estimate section is not part of the current Quote Version';
 end if;

 select * into item_row from public.catalog_items
 where id=result_row.catalog_item_id and organization_id=org_id and active;

 if item_row.id is null then raise exception 'Catalog item not found'; end if;

 select coalesce(max(sort_order),0)+10 into next_sort from public.estimate_lines where section_id=section_id_input;

 insert into public.estimate_lines(
  organization_id,quote_id,quote_version_id,section_id,line_type,source_type,source_id,catalog_item_id,
  manufacturer,part_number,description,uom,quantity,unit_material_cost,unit_sell,sort_order
 ) values(
  org_id,quote_id_input,version_id,section_id_input,item_row.item_type::text::public.estimate_line_type,
  'rule',result_row.id,item_row.id,item_row.manufacturer,item_row.part_number,item_row.description,
  result_row.output_unit,result_row.output_value,item_row.approved_cost,0,next_sort
 ) returning id into new_line;

 insert into public.quantity_contributions(
  organization_id,quote_id,quote_version_id,estimate_line_id,source_type,source_id,label,quantity,uom
 ) values(
  org_id,quote_id_input,version_id,new_line,'rule',result_row.id,result_row.output_label,result_row.output_value,result_row.output_unit
 );

 update public.rule_results set status='accepted',accepted_estimate_line_id=new_line where id=result_row.id;
 return new_line;
end$$;

grant execute on function public.accept_rule_result_to_bom(uuid,uuid,uuid) to authenticated;

commit;
