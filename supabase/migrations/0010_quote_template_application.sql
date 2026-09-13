-- ScopeLogic Software Alpha 1 — Live Quote Parity 1
-- Apply a reusable Quote Template into the current draft Quote Version without
-- deleting or replacing existing estimate work.
-- Requires 0009_quote_templates_foundation.sql to be committed first.
-- APPLY ONLY TO THE ISOLATED SCOPELOGIC SOFTWARE ALPHA PROJECT.

begin;

create or replace function public.apply_quote_template_to_quote_v1(
  template_id_input uuid,
  quote_id_input uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  template_org_id uuid;
  template_name text;
  current_version uuid;
  template_section record;
  template_line record;
  target_section_id uuid;
  next_section_sort integer;
  next_line_sort integer;
  new_line_id uuid;
  applied_count integer := 0;
begin
  select q.organization_id, q.current_version_id
  into org_id, current_version
  from public.quotes q
  where q.id = quote_id_input;

  if org_id is null or current_version is null then raise exception 'Quote not found'; end if;
  if not private.can_access_quote(quote_id_input) then raise exception 'Quote access denied'; end if;
  if not private.has_permission(org_id, 'quotes.edit') then raise exception 'Permission denied'; end if;

  perform private.assert_quote_version_is_draft(current_version);

  select qt.organization_id, qt.name
  into template_org_id, template_name
  from public.quote_templates qt
  where qt.id = template_id_input and qt.active = true;

  if template_org_id is null or template_org_id <> org_id then
    raise exception 'Quote Template is not available in this organization';
  end if;

  for template_section in
    select qts.id, qts.name, qts.sort_order
    from public.quote_template_sections qts
    where qts.quote_template_id = template_id_input
    order by qts.sort_order, qts.created_at
  loop
    select es.id into target_section_id
    from public.estimate_sections es
    where es.quote_version_id = current_version
      and lower(btrim(es.name)) = lower(btrim(template_section.name))
    order by es.sort_order
    limit 1;

    if target_section_id is null then
      select coalesce(max(sort_order), 0) + 100 into next_section_sort
      from public.estimate_sections where quote_version_id = current_version;

      insert into public.estimate_sections(
        organization_id, quote_id, quote_version_id, name, sort_order
      ) values (
        org_id, quote_id_input, current_version, template_section.name, next_section_sort
      ) returning id into target_section_id;
    end if;

    select coalesce(max(sort_order), 0) into next_line_sort
    from public.estimate_lines where section_id = target_section_id;

    for template_line in
      select qtl.*
      from public.quote_template_lines qtl
      where qtl.quote_template_id = template_id_input
        and qtl.section_id = template_section.id
      order by qtl.sort_order, qtl.created_at
    loop
      next_line_sort := next_line_sort + 100;

      insert into public.estimate_lines(
        organization_id,
        quote_id,
        quote_version_id,
        section_id,
        line_type,
        source_type,
        source_id,
        catalog_item_id,
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
        price_source_label,
        sort_order
      ) values (
        org_id,
        quote_id_input,
        current_version,
        target_section_id,
        template_line.line_type,
        'template'::public.estimate_source_type,
        template_line.id,
        template_line.catalog_item_id,
        template_line.manufacturer,
        template_line.part_number,
        template_line.description,
        template_line.uom,
        template_line.quantity,
        template_line.unit_material_cost,
        template_line.labor_hours_per_unit,
        template_line.labor_rate,
        template_line.unit_other_cost,
        template_line.unit_sell,
        'Quote Template: ' || template_name,
        next_line_sort
      ) returning id into new_line_id;

      insert into public.quantity_contributions(
        organization_id,
        quote_id,
        quote_version_id,
        estimate_line_id,
        source_type,
        source_id,
        label,
        quantity,
        uom
      ) values (
        org_id,
        quote_id_input,
        current_version,
        new_line_id,
        'template'::public.estimate_source_type,
        template_line.id,
        'Quote Template: ' || template_name,
        template_line.quantity,
        template_line.uom
      );

      applied_count := applied_count + 1;
    end loop;

    target_section_id := null;
  end loop;

  insert into public.audit_events(
    organization_id, actor_user_id, entity_type, entity_id, action, details
  ) values (
    org_id,
    auth.uid(),
    'quote',
    quote_id_input,
    'quote_template.applied',
    jsonb_build_object(
      'template_id', template_id_input,
      'template_name', template_name,
      'quote_version_id', current_version,
      'lines_added', applied_count
    )
  );

  return applied_count;
end;
$$;

revoke all on function public.apply_quote_template_to_quote_v1(uuid,uuid) from public;
grant execute on function public.apply_quote_template_to_quote_v1(uuid,uuid) to authenticated;

commit;
