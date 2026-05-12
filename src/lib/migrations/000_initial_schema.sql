-- ============================================================
-- 000_initial_schema.sql
-- 먹킷맵 베이스 테이블 생성 (신규 환경 전용)
-- Supabase Dashboard > SQL Editor 에서 가장 먼저 실행하세요.
-- ============================================================

create extension if not exists pgcrypto;

-- ── 프로젝트 (지도방) ─────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique,
  created_at timestamptz not null default now()
);

-- ── 멤버 (참여자) ────────────────────────────────────────────
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nickname text not null,
  marker_color text not null default '#10b981',
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

-- ── 장소 (맛집) ──────────────────────────────────────────────
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  name text not null,
  naver_map_url text,
  address text,
  lat double precision not null,
  lng double precision not null,
  category text not null default '기타',
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 인덱스 ──────────────────────────────────────────────────
create index if not exists members_project_id_idx on public.members(project_id);
create index if not exists members_user_id_idx on public.members(user_id);
create index if not exists places_project_id_idx on public.places(project_id);
create index if not exists places_member_id_idx on public.places(member_id);
create index if not exists projects_invite_code_idx on public.projects(invite_code);
