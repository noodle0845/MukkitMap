# 먹킷맵

친구 추천 기반 공유 맛집 지도 웹앱 MVP입니다. 프로젝트별로 비공개 지도방을 만들고, 초대받은 멤버만 맛집, 카페, 술집, 디저트, 놀거리 장소를 함께 관리할 수 있습니다.

배포 주소: https://mukkit-map.vercel.app

## 주요 기능

- Google/이메일 로그인
- 프로젝트별 비공개 먹킷맵 생성
- `/invite/:inviteCode` 초대 링크 참여
- owner/editor/viewer 권한 구조
- 참여자별 마커 색상 지정
- 네이버 지도 기반 장소 마커 표시
- 지도 클릭 위치의 주소 조회
- 카카오 주변 장소 후보 조회
- 네이버 지역 검색으로 장소 입력
- 장소 추가, 수정, 삭제
- 참여자, 카테고리, 태그 필터
- 프로젝트 삭제
- Supabase 저장소 사용, localStorage 개발 fallback

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Naver Maps JavaScript API
- Naver Maps Geocoding / Reverse Geocoding
- Kakao Local REST API
- Supabase Auth / Postgres / RLS

## 실행 방법

```bash
npm install
npm run dev
```

PowerShell에서 `npm` 실행이 막히면 아래처럼 실행합니다.

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 접속합니다.

```txt
http://localhost:3000
```

## 환경 변수

프로젝트 루트에 `.env.local`을 만들고 아래 값을 넣습니다.

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_maps_client_id
NAVER_MAP_CLIENT_SECRET=your_naver_cloud_maps_client_secret
NAVER_SEARCH_CLIENT_ID=your_naver_developers_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_naver_developers_search_client_secret
KAKAO_REST_API_KEY=your_kakao_rest_api_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Vercel 배포 환경에서는 Project Settings > Environment Variables에 같은 값을 추가한 뒤 재배포합니다.

주의: `.env.local`은 GitHub에 올리지 않습니다.

## Supabase 설정

Supabase 프로젝트를 만든 뒤 SQL Editor에서 아래 순서로 실행합니다.

```txt
src/lib/migrations/001_add_auth.sql
src/lib/migrations/002_private_projects.sql
```

`002_private_projects.sql`은 비공개 접근 제한을 적용합니다.

- 프로젝트 조회: 로그인한 사용자가 해당 프로젝트 멤버일 때만 허용
- 프로젝트 생성: 로그인 사용자만 가능
- 프로젝트 수정/삭제: owner만 가능
- 멤버 관리: owner만 가능
- 장소 보기: owner/editor/viewer 가능
- 장소 추가/수정/삭제: owner/editor 가능
- 초대 참여: `/invite/:inviteCode` 검증 RPC를 통과해야 가능

현재 코드에서는 앱의 `members` 테이블이 요구사항의 `project_members` 역할을 합니다. 마이그레이션은 확인용 `project_members` 뷰도 생성합니다.

## Naver 설정

Naver Cloud Platform에서 Maps Application을 만들고 아래 API를 활성화합니다.

- Dynamic Map
- Geocoding
- Reverse Geocoding

Web 서비스 URL에는 개발 및 배포 주소를 등록합니다.

```txt
http://localhost
http://127.0.0.1
https://mukkit-map.vercel.app
```

## Kakao 설정

Kakao Developers에서 앱을 만들고 REST API 키를 `KAKAO_REST_API_KEY`로 등록합니다.

제품 링크 관리 > 웹 도메인에는 아래 주소를 등록합니다.

```txt
https://mukkit-map.vercel.app
http://localhost:3000
http://127.0.0.1:3000
```

## 프로젝트 구조

```txt
src/
  app/
    api/
      kakao/
      naver/
    auth/
    invite/
    projects/
  components/
    AuthPage.tsx
    HomeClient.tsx
    InvitePageClient.tsx
    MemberForm.tsx
    MemberList.tsx
    NaverMapView.tsx
    PlaceForm.tsx
    ProjectList.tsx
    ProjectPageClient.tsx
  contexts/
    AuthContext.tsx
  lib/
    migrations/
    storage.ts
    supabaseStorage.ts
    types.ts
    utils.ts
```

## 다음 확장 포인트

- TODO: Supabase Realtime으로 장소/멤버 변경 즉시 반영
- TODO: 로그인 사용자 프로필과 멤버 프로필 연결 강화
- TODO: 초대 권한 만료/재발급 정책 추가
- TODO: 네이버 지도 링크 기반 장소 정보 자동 추출
- TODO: 모바일 앱 확장
