# Supabase Migration 가이드

먹킷맵 데이터베이스 마이그레이션 SQL 모음.
모든 SQL은 Supabase Dashboard → SQL Editor 에서 실행한다.

## 신규 환경 셋업

**아래 순서대로** 실행하면 된다:

| # | 파일 | 역할 |
|---|---|---|
| 1 | `000_initial_schema.sql` | 베이스 테이블 생성 (projects, members, places) |
| 2 | `002_private_projects.sql` | RLS 정책 + 헬퍼 함수 (`is_project_member`, `has_project_role` 등) |
| 3 | `003_verify_and_patch.sql` | FK CASCADE 보강 |
| 4 | `004_create_project_rpc.sql` | **필수.** 프로젝트 생성 RPC (`create_project_as_owner`) |
| 5 | `005_place_social_features.sql` | 좋아요/방문/리뷰 테이블 + RLS |
| 6 | `006_project_membership_controls.sql` | 멤버 권한 정책 정리 |
| 7 | `007_legacy_signed_owner_access.sql` | 레거시 owner 폴백 처리 |

## ⚠ 주의사항

### `001_add_auth.sql` 은 건너뛰어도 된다

`002`가 `001`이 만든 정책을 모두 `drop policy if exists`로 제거하고 새로 만든다.
기존 환경 호환용으로만 남겨둔 파일이라, 신규 셋업 시에는 실행하지 않아도 된다.
(실행해도 idempotent해서 문제는 없음.)

### `004`까지 반드시 돌릴 것

`004`를 건너뛰면 프로젝트 생성 시 트리거를 통해 'admin' 역할로 멤버가 등록되는데,
RLS 정책은 'owner' 기준이라 본인이 만든 프로젝트인데도 권한이 안 먹힌다.
`004`는 트리거를 제거하고 SECURITY DEFINER RPC로 대체한다.

### 모든 SQL은 idempotent

`create table if not exists`, `drop policy if exists`, `create or replace function`
같은 패턴으로 작성되어 있어서, 같은 마이그레이션을 여러 번 실행해도 안전하다.

## 기존 환경 업그레이드

이미 운영 중인 DB라면 누락된 마이그레이션만 순서대로 실행하면 된다.
어느 마이그레이션까지 적용됐는지 헷갈리면, 아래 쿼리로 함수/정책 존재 여부를 확인:

```sql
-- 002 적용 여부 (헬퍼 함수)
select proname from pg_proc where proname in ('is_project_member', 'has_project_role');

-- 004 적용 여부 (프로젝트 생성 RPC)
select proname from pg_proc where proname = 'create_project_as_owner';

-- 005 적용 여부 (소셜 테이블)
select table_name from information_schema.tables
where table_name in ('place_reactions', 'place_visits', 'place_reviews');
```

## OAuth Redirect URL 설정 (코드 외 설정)

`003`의 주석에도 있지만, Supabase Dashboard → Authentication → URL Configuration 에서
아래 패턴을 Redirect URLs 에 추가해야 OAuth(Google/카카오) 로그인 후 `returnTo` 경로가 작동한다:

- `https://mukkit-map.vercel.app/**`
- 개발 환경이면: `http://localhost:3000/**`

설정 안 하면 로그인 후 무조건 `/` 로 떨어진다.
