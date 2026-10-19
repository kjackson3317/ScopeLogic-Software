-- ScopeLogic Software Alpha demo ONLY. Apply after migration 0008 in isolated Alpha.
-- Reviewed Bluebeam snapshots replace prior Bluebeam quantities atomically.
begin;

create table if not exists public.bluebeam_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  source_filename text not null,
  input_count integer not null check (input_count >= 1),
  total_count numeric(18,6) not null check (total_count >= 0),
  imported_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists bluebeam_import_version_idx
  on public.bluebeam_import_batches(quote_version_id, created_at desc);
alter table public.bluebeam_import_batches enable row level security;
create policy bluebeam_import_batches_select on public.bluebeam_import_batches
  for select to authenticated using (private.can_access_quote(quote_id));
grant select on public.bluebeam_import_batches to authenticated;

create or replace function public.apply_bluebeam_quantity_snapshot(
  quote_id_input uuid, filename_input text, inputs_input jsonb
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  org_id uuid; version_id uuid; import_id uuid;
  item jsonb; item_key text; item_label text; item_value numeric;
  seen_keys text[] := array[]::text[]; total_value numeric := 0;
begin
  select organization_id, current_version_id into org_id, version_id
  from public.quotes where id = quote_id_input for update;
  if org_id is null or not private.can_access_quote(quote_id_input) or
     not private.has_permission(org_id, 'rules.use') then
    raise exception 'Permission denied';
  end if;
  perform private.assert_quote_version_is_draft(version_id);
  if jsonb_typeof(inputs_input) is distinct from 'array' or
     jsonb_array_length(inputs_input) not between 1 and 1000 then
    raise exception 'Provide between 1 and 1000 mapped quantity inputs';
  end if;
  if length(btrim(coalesce(filename_input,''))) not between 1 and 255 then
    raise exception 'Source filename required';
  end if;
  for item in select value from jsonb_array_elements(inputs_input) as t(value) loop
    item_key := btrim(coalesce(item->>'inputKey',''));
    item_label := btrim(coalesce(item->>'label',''));
    if length(item_key) not between 1 and 120 or
       length(item_label) not between 1 and 255 or item_key = any(seen_keys) then
      raise exception 'Invalid or repeated Bluebeam input key';
    end if;
    if jsonb_typeof(item->'value') is distinct from 'number' then
      raise exception 'Bluebeam quantity must be a number';
    end if;
    item_value := (item->>'value')::numeric;
    if item_value <> trunc(item_value) or item_value < 1 or item_value > 10000000 then
      raise exception 'Bluebeam quantity must be a positive whole number';
    end if;
    seen_keys := array_append(seen_keys, item_key);
    total_value := total_value + item_value;
  end loop;

  -- Replaces Bluebeam contributions on the current DRAFT version only.
  -- Manual inputs and estimate BOM lines remain unchanged.
  delete from public.quantity_inputs
    where quote_id = quote_id_input and quote_version_id = version_id
      and source_type = 'bluebeam';

  for item in select value from jsonb_array_elements(inputs_input) as t(value) loop
    insert into public.quantity_inputs(
      organization_id, quote_id, quote_version_id, input_key, label,
      value, unit, source_type
    ) values (
      org_id, quote_id_input, version_id,
      btrim(item->>'inputKey'), btrim(item->>'label'),
      (item->>'value')::numeric, 'EA', 'bluebeam'
    );
  end loop;

  insert into public.bluebeam_import_batches(
    organization_id, quote_id, quote_version_id, source_filename,
    input_count, total_count, imported_by_user_id
  ) values (
    org_id, quote_id_input, version_id, btrim(filename_input),
    jsonb_array_length(inputs_input), total_value, auth.uid()
  ) returning id into import_id;

  insert into public.audit_events(
    organization_id, actor_user_id, entity_type, entity_id, action, details
  ) values (
    org_id, auth.uid(), 'quote_version', version_id, 'bluebeam_quantity_import',
    jsonb_build_object('import_id', import_id, 'filename', filename_input,
                      'mapped_inputs', jsonb_array_length(inputs_input))
  );
  return import_id;
end
$$;
revoke all on function public.apply_bluebeam_quantity_snapshot(uuid,text,jsonb) from public;
grant execute on function public.apply_bluebeam_quantity_snapshot(uuid,text,jsonb) to authenticated;

-- Deterministic input precedence: Bluebeam wins for matching rule keys.
-- Manual records remain available without being summed with imported values.
create or replace function public.run_rules_for_quote(quote_id_input uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid; version_id uuid; run_id uuid; rule_row record; input_row record; calculated numeric;
begin
  select organization_id,current_version_id into org_id,version_id
    from public.quotes where id=quote_id_input;
  if org_id is null or not private.can_access_quote(quote_id_input) or
     not private.has_permission(org_id,'rules.use') then raise exception 'Permission denied'; end if;
  perform private.assert_quote_version_is_draft(version_id);
  insert into public.rule_runs(organization_id,quote_id,quote_version_id,run_by_user_id)
    values(org_id,quote_id_input,version_id,auth.uid()) returning id into run_id;
  for rule_row in
    select r.id as rule_id, rv.* from public.rules r
      join public.rule_versions rv on rv.id = r.current_version_id
    where r.organization_id=org_id and r.status in('draft','published')
  loop
    select * into input_row from public.quantity_inputs
      where quote_version_id=version_id and input_key=rule_row.input_key
      order by (source_type='bluebeam') desc, updated_at desc, id desc limit 1;
    if input_row.id is not null then
      calculated:=input_row.value*rule_row.factor*(1+(rule_row.waste_percent/100.0));
      insert into public.rule_results(
        organization_id,rule_run_id,rule_id,rule_version_id,quote_id,quote_version_id,
        input_key,input_value,output_label,output_value,output_unit,behavior,catalog_item_id
      ) values (
        org_id,run_id,rule_row.rule_id,rule_row.id,quote_id_input,version_id,
        rule_row.input_key,input_row.value,rule_row.output_label,calculated,
        rule_row.output_unit,rule_row.behavior,rule_row.catalog_item_id
      );
    end if;
  end loop;
  return run_id;
end$$;

commit;
