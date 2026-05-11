-- ============================================================
-- 006_project_membership_controls.sql
-- 프로젝트 나가기, 기존 방장 없는 프로젝트 보정
-- Supabase Dashboard > SQL Editor 에서 1회 실행하세요.
-- ============================================================

-- 오래된 데이터 중 owner가 없는 프로젝트는 가장 먼저 생성된 참여자를 owner로 보정합니다.
with ownerless_projects as (
  select p.id as project_id
  from public.projects p
  where not exists (
    select 1
    from public.members m
    where m.project_id = p.id
      and m.role = 'owner'
  )
),
ranked_members as (
  select
    m.id,
    row_number() over (
      partition by m.project_id
      order by m.created_at asc, m.id asc
    ) as rn
  from public.members m
  join ownerless_projects op on op.project_id = m.project_id
)
update public.members m
set role = 'owner'
from ranked_members r
where m.id = r.id
  and r.rn = 1;

-- 참여자는 자기 자신을 프로젝트에서 나갈 수 있어야 합니다.
drop policy if exists "members can leave project" on public.members;

create policy "members can leave project"
  on public.members for delete
  using (user_id = auth.uid());
