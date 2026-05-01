# 먹킷맵

친구 추천 기반 공유 맛집 지도 웹앱 MVP입니다. 프로젝트별로 참여자를 만들고, 네이버 지도 링크와 직접 입력한 좌표를 저장해 공유 맛집 지도를 관리합니다.

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- 네이버 지도 API 우선 사용
- 네이버 Client ID가 없으면 Leaflet / OpenStreetMap으로 fallback
- localStorage 저장소

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 또는 `http://127.0.0.1:3000`으로 접속하면 됩니다.

PowerShell 실행 정책 때문에 `npm`이 막히면 아래처럼 실행하세요.

```bash
npm.cmd install
npm.cmd run dev
```

## 네이버 지도 설정

로컬에서는 `.env.local`에 네이버 지도 Client ID를 넣습니다.

```env
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_maps_client_id
NAVER_MAP_CLIENT_SECRET=your_naver_cloud_maps_client_secret
```

실제 네이버 지역 검색 결과를 불러오려면 네이버 개발자센터의 검색 API 키도 서버 환경변수로 넣습니다.

```env
NAVER_SEARCH_CLIENT_ID=your_naver_developers_search_client_id
NAVER_SEARCH_CLIENT_SECRET=your_naver_developers_search_client_secret
```

지도에서 특정 위치를 클릭했을 때 주변 매장 후보를 보여주려면 카카오 디벨로퍼스의 REST API 키도 추가합니다. 카카오 로컬 API는 좌표와 반경 기반 장소 검색을 지원해서, 네이버 지도 타일에 표시된 매장명과 비슷한 후보를 고르는 용도로 사용합니다.

```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

네이버 클라우드 콘솔의 Maps Application에는 개발용 Web 서비스 URL을 등록해두세요.

```txt
http://127.0.0.1
http://localhost
```

지도 클릭 후 주소를 자동으로 채우려면 Maps Application에서 `Reverse Geocoding`도 선택하세요. REST 방식까지 쓰려면 같은 Application의 Client Secret을 `NAVER_MAP_CLIENT_SECRET`에 넣습니다. 선택하지 않아도 클릭한 위치의 위도와 경도는 폼에 입력됩니다.

나중에 배포 도메인이 생기면 같은 Application의 Web 서비스 URL에 운영 도메인을 추가하면 됩니다.

## 주요 기능

- 프로젝트 생성 및 목록 조회
- 참여자 추가/삭제
- 장소 추가/수정/삭제
- 참여자, 카테고리, 태그 필터
- 지도 마커와 장소 리스트 연동
- 네이버 지역 검색 결과를 장소 등록 폼에 입력
- 추천자 색상 기반 마커 표시
- 장소 상세 카드와 네이버 지도 새 탭 열기
- 프로젝트 공유 링크 복사
- 샘플 데이터 생성

## MVP 제약

현재 데이터는 브라우저 `localStorage`에 저장됩니다. 같은 URL을 복사할 수는 있지만, 다른 기기나 다른 브라우저에는 데이터가 자동으로 동기화되지 않습니다. 이후 Supabase, Firebase, 로그인/초대 기능을 붙일 수 있도록 데이터 타입과 저장소 함수를 분리했습니다.

## 확장 포인트

코드 안에 다음 TODO 주석을 남겨두었습니다.

- TODO: Supabase 연동
- TODO: 네이버 지도 API 연동
- TODO: 네이버 지도 링크 기반 장소 정보 자동 추출
- TODO: 로그인/초대 기능 추가
