-- Run only in the isolated ScopeLogic Software Alpha database.

select 'organizations' as check_name,count(*) as row_count from public.organizations
union all select 'memberships',count(*) from public.organization_memberships
union all select 'projects',count(*) from public.projects
union all select 'quotes',count(*) from public.quotes
union all select 'quote_versions',count(*) from public.quote_versions
union all select 'catalog_items',count(*) from public.catalog_items
union all select 'rules',count(*) from public.rules
union all select 'documents',count(*) from public.documents
union all select 'proposal_profiles',count(*) from public.proposal_profiles;

select
  o.name,
  count(distinct r.id) as role_count,
  count(distinct e.module_key) filter(where e.enabled) as enabled_module_count
from public.organizations o
left join public.organization_roles r on r.organization_id=o.id
left join public.organization_module_entitlements e on e.organization_id=o.id
group by o.id,o.name;
