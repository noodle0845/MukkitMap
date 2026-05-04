-- ============================================================
-- 먹킷맵 Auth Migration
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ============================================================

-- ── 1. 컬럼 추가 ────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. RLS 활성화 ────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE places   ENABLE ROW LEVEL SECURITY;

-- ── 3. projects RLS 정책 ─────────────────────────────────────

-- (a) 멤버인 사용자는 프로젝트를 조회할 수 있다
CREATE POLICY "members can view project"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = projects.id
        AND members.user_id = auth.uid()
    )
  );

-- (b) invite_code 로 프로젝트를 공개 조회할 수 있다 (초대 흐름)
--     invite_code IS NOT NULL 인 행만 허용
CREATE POLICY "public invite code lookup"
  ON projects FOR SELECT
  USING (invite_code IS NOT NULL);

-- (c) 로그인한 사용자는 새 프로젝트를 생성할 수 있다
CREATE POLICY "auth users can create project"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- (d) 해당 프로젝트의 admin 만 수정할 수 있다
CREATE POLICY "admin can update project"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = projects.id
        AND members.user_id = auth.uid()
        AND members.role = 'admin'
    )
  );

-- (e) 해당 프로젝트의 admin 만 삭제할 수 있다
CREATE POLICY "admin can delete project"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = projects.id
        AND members.user_id = auth.uid()
        AND members.role = 'admin'
    )
  );

-- ── 4. members RLS 정책 ──────────────────────────────────────

-- (a) 같은 프로젝트 멤버는 멤버 목록을 볼 수 있다
CREATE POLICY "project members can view members"
  ON members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members m2
      WHERE m2.project_id = members.project_id
        AND m2.user_id = auth.uid()
    )
  );

-- (b) 초대 흐름: 로그인한 사용자는 자신을 멤버로 추가할 수 있다
--     (invite_code 검증은 앱 레이어에서 수행)
CREATE POLICY "auth users can join project"
  ON members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- (c) admin 은 직접 멤버를 추가할 수 있다 (user_id 없이도)
CREATE POLICY "admin can insert members"
  ON members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members m2
      WHERE m2.project_id = members.project_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
  );

-- (d) admin 은 멤버를 삭제할 수 있다
CREATE POLICY "admin can delete members"
  ON members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members m2
      WHERE m2.project_id = members.project_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
  );

-- (e) admin 은 멤버 역할을 수정할 수 있다
CREATE POLICY "admin can update members"
  ON members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members m2
      WHERE m2.project_id = members.project_id
        AND m2.user_id = auth.uid()
        AND m2.role = 'admin'
    )
  );

-- ── 5. places RLS 정책 ───────────────────────────────────────

-- (a) 같은 프로젝트 멤버는 장소를 볼 수 있다
CREATE POLICY "project members can view places"
  ON places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = places.project_id
        AND members.user_id = auth.uid()
    )
  );

-- (b) admin 또는 member(editor) 는 장소를 추가할 수 있다
CREATE POLICY "admin or member can insert place"
  ON places FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = places.project_id
        AND members.user_id = auth.uid()
        AND members.role IN ('admin', 'member')
    )
  );

-- (c) admin 또는 member 는 장소를 수정할 수 있다
CREATE POLICY "admin or member can update place"
  ON places FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = places.project_id
        AND members.user_id = auth.uid()
        AND members.role IN ('admin', 'member')
    )
  );

-- (d) admin 또는 member 는 장소를 삭제할 수 있다
CREATE POLICY "admin or member can delete place"
  ON places FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.project_id = places.project_id
        AND members.user_id = auth.uid()
        AND members.role IN ('admin', 'member')
    )
  );

-- ── 6. 프로젝트 생성 시 creator 를 admin 으로 자동 등록하는 함수 ──

CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 프로젝트를 만든 사용자를 admin 멤버로 자동 추가
  INSERT INTO members (id, project_id, user_id, nickname, marker_color, role, created_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    auth.uid(),
    COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      '방장'
    ),
    '#10b981',   -- emerald-500
    'admin',
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 트리거: projects INSERT 후 실행
DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE PROCEDURE handle_new_project();

-- ── 7. invite_code 자동 생성 함수 ───────────────────────────

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := gen_random_uuid()::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invite_code ON projects;
CREATE TRIGGER set_invite_code
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE PROCEDURE generate_invite_code();
