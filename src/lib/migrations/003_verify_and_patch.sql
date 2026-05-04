-- ============================================================
-- 003_verify_and_patch.sql
-- 플로우 검증 후 발견된 누락 사항 보완
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- (002_private_projects.sql 이 이미 실행된 상태에서 추가 실행)
-- ============================================================

-- ── 1. Google OAuth redirect URL 안내 (SQL로 설정 불가, 대시보드에서 직접 설정) ──
-- Supabase Dashboard > Authentication > URL Configuration 에서
-- Redirect URLs 에 아래 패턴을 추가해야 합니다:
--   https://mukkit-map.vercel.app/**
-- 없으면 Google 로그인 후 returnTo 경로(/invite/xxx 등)가 무시됩니다.

-- ── 2. members.project_id FK CASCADE 확인 및 추가 ────────────────────
-- project 삭제 시 members와 places가 자동 삭제되도록 CASCADE 설정
-- (이미 CASCADE가 있으면 무시됩니다)

DO $$
DECLARE
  v_conname text;
BEGIN
  -- members.project_id CASCADE 없으면 재설정
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.members'::regclass
    AND contype = 'f'
    AND confrelid = 'public.projects'::regclass;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.members DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.members
  ADD CONSTRAINT members_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

DO $$
DECLARE
  v_conname text;
BEGIN
  -- places.project_id CASCADE 없으면 재설정
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.places'::regclass
    AND contype = 'f'
    AND confrelid = 'public.projects'::regclass;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.places DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.places
  ADD CONSTRAINT places_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- ── 3. places.member_id FK → ON DELETE SET NULL ──────────────────────
-- 멤버 삭제 시 해당 멤버가 등록한 장소의 member_id를 NULL로 처리
-- (장소 자체는 남아있고 "알 수 없음" 멤버로 표시)

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.places'::regclass
    AND contype = 'f'
    AND confrelid = 'public.members'::regclass;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.places DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.places
  ADD CONSTRAINT places_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- ── 4. 초대 링크 재생성 시 기존 링크 무효화 확인 ────────────────────────
-- regenerate_invite_code 함수는 invite_code 컬럼 값을 업데이트합니다.
-- get_project_by_invite_code 는 invite_code 값으로 조회하므로
-- 새 코드가 발급되면 기존 코드로의 조회는 자동으로 실패합니다. ✅
-- (별도 만료 테이블 없이도 자동 무효화)

-- ── 5. places RLS INSERT 정책 — 'editor' 역할도 허용 확인 ──────────────
-- 002에서 이미 올바르게 정의됨:
-- "owner editor insert places" → has_project_role(['owner', 'editor']) ✅
-- 혹시 정책이 없다면 아래로 재생성:
DROP POLICY IF EXISTS "owner editor insert places" ON public.places;
CREATE POLICY "owner editor insert places"
  ON public.places FOR INSERT
  WITH CHECK (public.has_project_role(project_id, array['owner', 'editor']));

DROP POLICY IF EXISTS "owner editor update places" ON public.places;
CREATE POLICY "owner editor update places"
  ON public.places FOR UPDATE
  USING (public.has_project_role(project_id, array['owner', 'editor']))
  WITH CHECK (public.has_project_role(project_id, array['owner', 'editor']));

DROP POLICY IF EXISTS "owner editor delete places" ON public.places;
CREATE POLICY "owner editor delete places"
  ON public.places FOR DELETE
  USING (public.has_project_role(project_id, array['owner', 'editor']));

-- ── 6. anon 사용자가 get_project_by_invite_code 호출 가능한지 확인 ────
-- (이미 002에서 grant 됨, 없으면 재실행)
GRANT EXECUTE ON FUNCTION public.get_project_by_invite_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_project_by_invite(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, text[]) TO anon, authenticated;
