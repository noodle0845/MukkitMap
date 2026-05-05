-- ============================================================
-- 004_create_project_rpc.sql
-- 프로젝트 생성 + owner 등록을 단일 SECURITY DEFINER 함수로 처리
-- 트리거가 RLS를 우회하지 못하는 문제 해결
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ============================================================

-- 기존 트리거 제거 (RPC에서 직접 처리)
DROP TRIGGER IF EXISTS on_project_created ON public.projects;

-- 프로젝트 생성 + owner 자동 등록 함수
CREATE OR REPLACE FUNCTION public.create_project_as_owner(
  p_name text,
  p_description text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  invite_code text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_user_id uuid := auth.uid();
  v_nickname text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LOGIN_REQUIRED';
  END IF;

  -- 프로젝트 생성 (invite_code는 generate_invite_code 트리거가 자동 생성)
  INSERT INTO public.projects (name, description)
  VALUES (p_name, p_description)
  RETURNING projects.id INTO v_project_id;

  -- 생성자 닉네임: 이메일 앞부분 사용
  SELECT split_part(u.email, '@', 1)
  INTO v_nickname
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- 생성자를 owner로 등록 (SECURITY DEFINER이므로 RLS 우회)
  INSERT INTO public.members (project_id, user_id, nickname, marker_color, role)
  VALUES (
    v_project_id,
    v_user_id,
    COALESCE(NULLIF(v_nickname, ''), '방장'),
    '#10b981',
    'owner'
  )
  ON CONFLICT (project_id, user_id) WHERE user_id IS NOT NULL DO NOTHING;

  -- 생성된 프로젝트 반환
  RETURN QUERY
    SELECT p.id, p.name, COALESCE(p.description, ''), p.invite_code, p.created_at
    FROM public.projects p
    WHERE p.id = v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_project_as_owner(text, text) TO authenticated;
