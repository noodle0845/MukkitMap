-- 002_private_projects.sql
-- 먹킷맵을 "로그인한 멤버만 볼 수 있는 비공개 공유 지도"로 전환합니다.
-- 현재 앱의 members 테이블이 요구사항의 project_members 역할을 합니다.

create extension if not exists pgcrypto;

alter table public.projects
  add column if not exists invite_code text unique;

alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.projects enable row level security;
alter table public.members enable row level security;
alter table public.places enable row level security;

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.members drop constraint %I', r.conname);
  end loop;
end $$;

update public.members
set role = case
  when role = 'admin' then 'owner'
  when role = 'member' then 'editor'
  when role in ('owner', 'editor', 'viewer') then role
  else 'editor'
end;

alter table public.members alter column role set default 'editor';

alter table public.members
  add constraint members_role_check
  check (role in ('owner', 'editor', 'viewer'));

update public.projects
set invite_code = encode(gen_random_bytes(8), 'hex')
where invite_code is null;

alter table public.projects alter column invite_code set not null;

create unique index if not exists members_project_user_unique
  on public.members(project_id, user_id)
  where user_id is not null;

-- 기존 공개/레거시 정책 제거
drop policy if exists "mvp public read projects" on public.projects;
drop policy if exists "mvp public write projects" on public.projects;
drop policy if exists "mvp public update projects" on public.projects;
drop policy if exists "mvp public delete projects" on public.projects;
drop policy if exists "members can view project" on public.projects;
drop policy if exists "public invite code lookup" on public.projects;
drop policy if exists "auth users can create project" on public.projects;
drop policy if exists "admin can update project" on public.projects;
drop policy if exists "admin can delete project" on public.projects;
drop policy if exists "private select projects" on public.projects;
drop policy if exists "private insert projects" on public.projects;
drop policy if exists "owner update projects" on public.projects;
drop policy if exists "owner delete projects" on public.projects;

drop policy if exists "mvp public read members" on public.members;
drop policy if exists "mvp public write members" on public.members;
drop policy if exists "mvp public update members" on public.members;
drop policy if exists "mvp public delete members" on public.members;
drop policy if exists "project members can view members" on public.members;
drop policy if exists "auth users can join project" on public.members;
drop policy if exists "admin can insert members" on public.members;
drop policy if exists "admin can delete members" on public.members;
drop policy if exists "admin can update members" on public.members;
drop policy if exists "private select members" on public.members;
drop policy if exists "owner insert members" on public.members;
drop policy if exists "owner update members" on public.members;
drop policy if exists "owner delete members" on public.members;

drop policy if exists "mvp public read places" on public.places;
drop policy if exists "mvp public write places" on public.places;
drop policy if exists "mvp public update places" on public.places;
drop policy if exists "mvp public delete places" on public.places;
drop policy if exists "project members can view places" on public.places;
drop policy if exists "admin or member can insert place" on public.places;
drop policy if exists "admin or member can update place" on public.places;
drop policy if exists "admin or member can delete place" on public.places;
drop policy if exists "private select places" on public.places;
drop policy if exists "owner editor insert places" on public.places;
drop policy if exists "owner editor update places" on public.places;
drop policy if exists "owner editor delete places" on public.places;

-- RLS 정책 안에서 members를 다시 조회하면 재귀가 생기므로 SECURITY DEFINER 헬퍼를 씁니다.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.members
  where project_id = p_project_id
    and user_id = auth.uid()
  order by case role
    when 'owner' then 1
    when 'editor' then 2
    when 'viewer' then 3
    else 4
  end
  limit 1;
$$;

create or replace function public.has_project_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.project_role(p_project_id) = any(p_roles), false);
$$;

grant execute on function public.is_project_member(uuid) to anon, authenticated;
grant execute on function public.project_role(uuid) to anon, authenticated;
grant execute on function public.has_project_role(uuid, text[]) to anon, authenticated;

-- 초대 코드 조회는 inviteCode 하나로만 제한해서 프로젝트 ID 전체 공개를 막습니다.
create or replace function public.get_project_by_invite_code(p_invite_code text)
returns table (
  id uuid,
  name text,
  description text,
  invite_code text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, coalesce(p.description, ''), p.invite_code, p.created_at
  from public.projects p
  where p.invite_code = p_invite_code
  limit 1;
$$;

grant execute on function public.get_project_by_invite_code(text) to anon, authenticated;

-- 초대 참여는 projectId 직접 insert가 아니라 inviteCode 검증을 통과해야 합니다.
create or replace function public.join_project_by_invite(
  p_invite_code text,
  p_nickname text,
  p_marker_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select id into v_project_id
  from public.projects
  where invite_code = p_invite_code
  limit 1;

  if v_project_id is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  if exists (
    select 1
    from public.members
    where project_id = v_project_id
      and user_id = v_user_id
  ) then
    return v_project_id;
  end if;

  insert into public.members (
    project_id,
    user_id,
    nickname,
    marker_color,
    role
  )
  values (
    v_project_id,
    v_user_id,
    coalesce(nullif(trim(p_nickname), ''), '새 친구'),
    coalesce(nullif(p_marker_color, ''), '#10b981'),
    'editor'
  );

  return v_project_id;
end;
$$;

grant execute on function public.join_project_by_invite(text, text, text) to authenticated;

-- 프로젝트 정책
create policy "private select projects"
  on public.projects for select
  using (public.is_project_member(id));

create policy "private insert projects"
  on public.projects for insert
  with check (auth.uid() is not null);

create policy "owner update projects"
  on public.projects for update
  using (public.has_project_role(id, array['owner']))
  with check (public.has_project_role(id, array['owner']));

create policy "owner delete projects"
  on public.projects for delete
  using (public.has_project_role(id, array['owner']));

-- 멤버 정책
create policy "private select members"
  on public.members for select
  using (user_id = auth.uid() or public.is_project_member(project_id));

create policy "owner insert members"
  on public.members for insert
  with check (public.has_project_role(project_id, array['owner']));

create policy "owner update members"
  on public.members for update
  using (public.has_project_role(project_id, array['owner']))
  with check (public.has_project_role(project_id, array['owner']));

create policy "owner delete members"
  on public.members for delete
  using (public.has_project_role(project_id, array['owner']));

-- 장소 정책
create policy "private select places"
  on public.places for select
  using (public.is_project_member(project_id));

create policy "owner editor insert places"
  on public.places for insert
  with check (public.has_project_role(project_id, array['owner', 'editor']));

create policy "owner editor update places"
  on public.places for update
  using (public.has_project_role(project_id, array['owner', 'editor']))
  with check (public.has_project_role(project_id, array['owner', 'editor']));

create policy "owner editor delete places"
  on public.places for delete
  using (public.has_project_role(project_id, array['owner', 'editor']));

create or replace function public.generate_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null or new.invite_code = '' then
    new.invite_code := encode(gen_random_bytes(8), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists set_invite_code on public.projects;
create trigger set_invite_code
  before insert on public.projects
  for each row execute procedure public.generate_invite_code();

create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return new;
  end if;

  insert into public.members (
    project_id,
    user_id,
    nickname,
    marker_color,
    role
  )
  values (
    new.id,
    v_user_id,
    coalesce(
      nullif(split_part((select email from auth.users where id = v_user_id), '@', 1), ''),
      '방장'
    ),
    '#10b981',
    'owner'
  )
  on conflict (project_id, user_id) where user_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();

-- 요구사항의 project_members 명칭을 DB에서도 확인할 수 있게 읽기 전용 뷰를 둡니다.
drop view if exists public.project_members;
create view public.project_members
with (security_invoker = true)
as
select * from public.members;

grant select on public.project_members to authenticated;
