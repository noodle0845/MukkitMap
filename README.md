# 먹킷맵

친구 추천 기반 공유 맛집 지도 웹앱 MVP입니다. 프로젝트별로 참여자를 만들고, 참여자 색상 마커로 맛집, 카페, 술집, 디저트, 놀거리 장소를 지도에 정리할 수 있습니다.

배포 주소: https://mukkit-map.vercel.app

## 주요 기능

- 프로젝트 생성 및 목록 조회
- 참여자 추가, 삭제
- 참여자별 마커 색상 설정
- 장소 추가, 수정, 삭제
- 참여자, 카테고리, 태그 필터
- 네이버 지도 기반 장소 마커 표시
- 지도 클릭 후 주변 장소 후보 조회
- 후보 장소 선택 시 장소명, 주소, 좌표 자동 입력
- 장소 상세 카드에서 네이버 지도 새 탭 열기
- 프로젝트 공유 링크 복사
- 샘플 데이터 생성
- 브라우저 localStorage 저장 및 불러오기

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Naver Maps JavaScript API
- Naver Maps Geocoding / Reverse Geocoding
- Kakao Local REST API
- Supabase Postgres / REST API
- localStorage fallback

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```txt
http://localhost:3000
```

PowerShell에서 `npm` 실행이 막히면 아래처럼 실행합니다.

```bash
npm.cmd install
npm.cmd run dev
```

## 환경변수

로컬 개발 시 프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 넣습니다.

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_maps_client_id
NAVER_MAP_CLIENT_SECRET=your_naver_cloud_maps_client_secret
NAVER_SEARCH_CLIENT_ID=your_naver_developers_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_naver_developers_search_client_secret
KAKAO_REST_API_KEY=your_kakao_rest_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

Vercel 배포 환경에서는 Project Settings > Environment Variables에 같은 값을 추가합니다. 환경변수를 추가하거나 바꾼 뒤에는 재배포가 필요합니다.

주의: `.env.local`은 절대 GitHub에 올리지 않습니다.

## Supabase 설정

Supabase 프로젝트를 만들고 SQL Editor에서 `projects`, `members`, `places` 테이블을 생성합니다.

앱에서 사용하는 공개 환경변수는 아래 두 가지입니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

현재 MVP는 초대 링크와 공동 편집을 빠르게 검증하기 위해 공개 읽기/쓰기 정책을 사용합니다. 서비스 단계에서는 로그인과 프로젝트 멤버 권한 기준으로 RLS 정책을 강화해야 합니다.

## 네이버 설정

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

지도 화면은 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`를 사용합니다. 지도 클릭 시 주소를 찾는 기능은 `NAVER_MAP_CLIENT_SECRET`과 Reverse Geocoding 설정을 사용합니다.

## 카카오 설정

Kakao Developers에서 앱을 만들고 REST API 키를 `KAKAO_REST_API_KEY`로 등록합니다.

제품 링크 관리 > 웹 도메인에는 아래 주소를 등록합니다.

```txt
https://mukkit-map.vercel.app
http://localhost:3000
http://127.0.0.1:3000
```

현재 앱은 지도 클릭 좌표 주변의 실제 장소 후보를 Kakao Local REST API로 조회합니다. 후보를 클릭하면 장소 등록 폼에 장소명, 주소, 위도, 경도, 카테고리가 자동으로 입력됩니다.

## 프로젝트 구조

```txt
src/
  app/
    api/
      kakao/
      naver/
    projects/
  components/
    FilterPanel.tsx
    MemberForm.tsx
    MemberList.tsx
    NaverMapView.tsx
    NaverPlaceSearch.tsx
    PlaceDetailCard.tsx
    PlaceForm.tsx
    PlaceList.tsx
    ProjectForm.tsx
    ProjectList.tsx
  lib/
    naver.ts
    storage.ts
    types.ts
    utils.ts
```

## 현재 MVP 제한

Supabase 환경변수가 있으면 데이터는 Supabase에 저장되고, 같은 프로젝트 URL을 여는 친구들이 같은 데이터를 볼 수 있습니다.

Supabase 환경변수가 없으면 개발 편의를 위해 브라우저 `localStorage` 저장소로 fallback 됩니다. 이 경우 다른 브라우저와 데이터가 동기화되지 않습니다.

## 다음 확장 계획

- TODO: 프로젝트 초대 링크 추가
- TODO: 로그인 기능 추가
- TODO: 실시간 공동 편집
- TODO: 네이버 지도 링크 기반 장소 정보 자동 추출
- TODO: 모바일 앱 확장
