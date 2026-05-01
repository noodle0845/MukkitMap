import { isValidHttpUrl } from "@/lib/utils";

export type ResolvedNaverPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export async function resolvePlaceFromNaverMapUrl(
  naverMapUrl: string
): Promise<ResolvedNaverPlace | null> {
  if (!isValidHttpUrl(naverMapUrl)) {
    return null;
  }

  // TODO: 네이버 지도 링크 기반 장소 정보 자동 추출
  // 현재 MVP에서는 크롤링하지 않고 사용자가 직접 입력합니다.
  return null;
}

export async function geocodeAddress(
  address: string
): Promise<Pick<ResolvedNaverPlace, "lat" | "lng"> | null> {
  if (!address.trim()) {
    return null;
  }

  // TODO: 네이버 지도 API 연동
  // 이후 Geocoding API를 붙이면 주소 입력만으로 좌표를 채울 수 있습니다.
  return null;
}
