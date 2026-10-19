-- ScopeLogic Software Alpha ONLY: prevents duplicate rule-generated BOM
-- on revised Bluebeam imports and across draft quote revisions.
begin;

create or replace function public.accept_rule_result_to_bom(
 quote_id_input uuid, result_id_input uuid, section_id_input uuid
) returns uuid language plpgsql security definer set search_path=''
as $$
declare
 org_id uuid; version_id uuid; result_row record; item_row record;
 target_line uuid; next_sort integer; matched_lines integer; old_source_id uuid;
begin
 select organization_id,current_version_id into org_id,version_id
   from public.quotes where id=quote_id_input for update;
 if org_id is null or not private.can_access_quote(quote_id_input) or
    not private.has_permission(org_id,'quotes.edit') then
   raise exception 'Permission denied';
 end if;
 perform private.assert_quote_version_is_draft(version_id);

 select * into result_row from public.rule_results
 where id=result_id_input and quote_id=quote_id_input and
       quote_version_id=version_id and status='pending';
 if result_row.id is null then raise exception 'Pending rule result not found'; end if;
 if result_row.behavior <> 'recommend_bom' or result_row.catalog_item_id is null then
   raise exception 'Result is not a BOM recommendation';
 end if;
 if not exists(select 1 from public.estimate_sections
   where id=section_id_input and quote_version_id=version_id) then
   raise exception 'Estimate section is not part of the current Quote Version';
 end if;

 -- Prevent accepting obsolete results after a newer rule run.
 if exists(
   select 1 from public.rule_results rr
   join public.rule_runs newer on newer.id=rr.rule_run_id
   join public.rule_runs current_run on current_run.id=result_row.rule_run_id
   where rr.quote_version_id=version_id and rr.rule_id=result_row.rule_id
     and (newer.created_at, newer.id) > (current_run.created_at, current_run.id)
 ) then raise exception 'A newer rule result exists. Review the latest result instead'; end if;

 select * into item_row from public.catalog_items
 where id=result_row.catalog_item_id and organization_id=org_id and active;
 if item_row.id is null then raise exception 'Catalog item not found'; end if;

 -- Lookup uses the rule lineage, not just a particular result ID.
 -- It also finds rule-derived lines copied into a new quote revision.
 select count(*) into matched_lines
 from public.estimate_lines el
 join public.rule_results previous on previous.id=el.source_id
 where el.quote_version_id=version_id and el.quote_id=quote_id_input
   and el.source_type='rule' and previous.rule_id=result_row.rule_id;

 if matched_lines > 1 then
   raise exception 'Multiple lines already exist for this rule; reconcile them before accepting';
 end if;

 if matched_lines = 1 then
   select el.id, el.source_id into target_line, old_source_id
   from public.estimate_lines el
   join public.rule_results previous on previous.id=el.source_id
   where el.quote_version_id=version_id and el.quote_id=quote_id_input
     and el.source_type='rule' and previous.rule_id=result_row.rule_id;
   update public.estimate_lines
   set section_id=section_id_input, source_id=result_row.id,
       catalog_item_id=item_row.id,
       line_type=item_row.item_type::text::public.estimate_line_type,
       manufacturer=item_row.manufacturer,
       part_number=item_row.part_number,
       description=item_row.description,
       uom=result_row.output_unit,
       quantity=result_row.output_value,
       unit_material_cost=item_row.approved_cost
   where id=target_line and quote_version_id=version_id and source_type='rule';

   update public.quantity_contributions
     set source_id=result_row.id, label=result_row.output_label,
         quantity=result_row.output_value, uom=result_row.output_unit
     where estimate_line_id=target_line and source_type='rule';

   -- Do not mutate historical rule results from a prior quote revision.
   update public.rule_results
   set status='ignored', accepted_estimate_line_id=null
   where id=old_source_id and quote_version_id=version_id and status='accepted';
 else
   select coalesce(max(sort_order),0)+10 into next_sort
     from public.estimate_lines where section_id=section_id_input;
   insert into public.estimate_lines(
     organization_id,quote_id,quote_version_id,section_id,line_type,
     source_type,source_id,catalog_item_id,manufacturer,part_number,
     description,uom,quantity,unit_material_cost,unit_sell,sort_order
   ) values (
     org_id,quote_id_input,version_id,section_id_input,
     item_row.item_type::text::public.estimate_line_type,
     'rule',result_row.id,item_row.id,item_row.manufacturer,
     item_row.part_number,item_row.description,
     result_row.output_unit,result_row.output_value,item_row.approved_cost,0,next_sort
   ) returning id into target_line;
   insert into public.quantity_contributions(
     organization_id,quote_id,quote_version_id,estimate_line_id,
     source_type,source_id,label,quantity,uom
   ) values (
     org_id,quote_id_input,version_id,target_line,'rule',
     result_row.id,result_row.output_label,
     result_row.output_value,result_row.output_unit
   );
 end if;

 update public.rule_results
 set status='accepted',accepted_estimate_line_id=target_line
 where id=result_row.id;
 insert into public.audit_events(
   organization_id,actor_user_id,entity_type,entity_id,action,details
 ) values (
   org_id,auth.uid(),'estimate_line',target_line,'rule_result.accepted',
   jsonb_build_object('rule_id',result_row.rule_id,'result_id',result_row.id,
                      'quantity',result_row.output_value,
                      'replaced_existing',matched_lines=1)
 );
 return target_line;
end$$;

revoke all on function public.accept_rule_result_to_bom(uuid,uuid,uuid) from public;
grant execute on function public.accept_rule_result_to_bom(uuid,uuid,uuid) to authenticated;

commit;
