begin;

create table if not exists public.document_folders(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 parent_folder_id uuid references public.document_folders(id) on delete cascade,
 name text not null,sort_order integer not null default 100,
 created_at timestamptz not null default now()
);

create table if not exists public.documents(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 folder_id uuid references public.document_folders(id) on delete set null,
 name text not null,document_kind text not null default 'general',
 controlled boolean not null default false,
 status text not null default 'current' check(status in('current','superseded','archived')),
 current_version_id uuid,
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.document_versions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 revision_label text,
 storage_bucket text not null default 'project-documents',
 storage_path text not null,mime_type text,file_size bigint,
 review_status text not null default 'not_required' check(review_status in('not_required','review_required','reviewed')),
 is_current boolean not null default true,
 created_by_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

alter table public.documents add constraint documents_current_version_fk
foreign key(current_version_id) references public.document_versions(id) on delete set null;

insert into storage.buckets(id,name,public)
values('project-documents','project-documents',false)
on conflict(id) do update set public=false;

create or replace function private.seed_project_document_folders(target_project uuid,target_org uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare contract_id uuid;estimating_id uuid;correspondence_id uuid;
begin
 insert into public.document_folders(organization_id,project_id,name,sort_order) values(target_org,target_project,'Contract Documents',100) returning id into contract_id;
 insert into public.document_folders(organization_id,project_id,parent_folder_id,name,sort_order) values
 (target_org,target_project,contract_id,'Drawings',110),(target_org,target_project,contract_id,'Specifications',120);
 insert into public.document_folders(organization_id,project_id,name,sort_order) values(target_org,target_project,'RFIs',200);
 insert into public.document_folders(organization_id,project_id,name,sort_order) values(target_org,target_project,'Estimating',300) returning id into estimating_id;
 insert into public.document_folders(organization_id,project_id,parent_folder_id,name,sort_order) values
 (target_org,target_project,estimating_id,'Vendor Quotes',310),(target_org,target_project,estimating_id,'Working Files',320),
 (target_org,target_project,estimating_id,'Excel',330),(target_org,target_project,estimating_id,'Pricing',340);
 insert into public.document_folders(organization_id,project_id,name,sort_order) values(target_org,target_project,'Customer Correspondence',400) returning id into correspondence_id;
 insert into public.document_folders(organization_id,project_id,parent_folder_id,name,sort_order) values
 (target_org,target_project,correspondence_id,'Important Emails',410),(target_org,target_project,correspondence_id,'Meeting Notes',420);
 insert into public.document_folders(organization_id,project_id,name,sort_order) values
 (target_org,target_project,'Proposals',500),(target_org,target_project,'Award / Contract',600);
end$$;

do $$
declare p record;
begin
 for p in select id,organization_id from public.projects loop
  if not exists(select 1 from public.document_folders where project_id=p.id) then
    perform private.seed_project_document_folders(p.id,p.organization_id);
  end if;
 end loop;
end$$;


create or replace function private.seed_project_document_folders_trigger()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not exists(select 1 from public.document_folders where project_id=new.id) then
    perform private.seed_project_document_folders(new.id,new.organization_id);
  end if;
  return new;
end$$;

drop trigger if exists seed_project_document_folders_after_insert on public.projects;
create trigger seed_project_document_folders_after_insert
after insert on public.projects
for each row execute function private.seed_project_document_folders_trigger();

create or replace function public.register_uploaded_document(
 project_id_input uuid,folder_id_input uuid,name_input text,document_kind_input text,
 controlled_input boolean,revision_label_input text,storage_path_input text,mime_type_input text,file_size_input bigint
) returns uuid language plpgsql security definer set search_path=''
as $$
declare org_id uuid;doc_id uuid;ver_id uuid;
begin
 select organization_id into org_id from public.projects where id=project_id_input;
 if org_id is null or not private.can_access_project(project_id_input) or not private.has_permission(org_id,'documents.upload') then
  raise exception 'Permission denied';
 end if;
 insert into public.documents(organization_id,project_id,folder_id,name,document_kind,controlled,created_by_user_id)
 values(org_id,project_id_input,folder_id_input,btrim(name_input),coalesce(nullif(btrim(document_kind_input),''),'general'),coalesce(controlled_input,false),auth.uid())
 returning id into doc_id;
 insert into public.document_versions(organization_id,document_id,revision_label,storage_path,mime_type,file_size,review_status,is_current,created_by_user_id)
 values(org_id,doc_id,nullif(btrim(revision_label_input),''),storage_path_input,mime_type_input,file_size_input,
   case when controlled_input then 'review_required' else 'not_required' end,true,auth.uid())
 returning id into ver_id;
 update public.documents set current_version_id=ver_id where id=doc_id;
 return doc_id;
end$$;

alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

create policy document_folders_select on public.document_folders for select to authenticated using(private.can_access_project(project_id));
create policy documents_select on public.documents for select to authenticated using(private.can_access_project(project_id));
create policy document_versions_select on public.document_versions for select to authenticated using(
 exists(select 1 from public.documents d where d.id=document_id and private.can_access_project(d.project_id))
);

create policy storage_docs_select on storage.objects for select to authenticated
using(bucket_id='project-documents' and exists(
 select 1 from public.organization_memberships m
 where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=auth.uid() and m.status='active'
));

create policy storage_docs_insert on storage.objects for insert to authenticated
with check(bucket_id='project-documents' and exists(
 select 1 from public.organization_memberships m
 where m.organization_id=(storage.foldername(name))[1]::uuid and m.user_id=auth.uid() and m.status='active'
));

grant select,insert,update,delete on public.document_folders,public.documents,public.document_versions to authenticated;
grant execute on function public.register_uploaded_document(uuid,uuid,text,text,boolean,text,text,text,bigint) to authenticated;

commit;
