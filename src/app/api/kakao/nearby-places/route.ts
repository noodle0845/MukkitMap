import { NextRequest, NextResponse } from "next/server";
import type { PlaceCategory } from "@/lib/types";

type KakaoLocalDocument = {
  id?: string;
  place_name?: string;
  category_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  place_url?: string;
  distance?: string;
};

type NearbyPlaceItem = NonNullable<ReturnType<typeof normalizeDocument>>;

const NEARBY_CATEGORY_CODES = ["FD6", "CE7", "CT1", "AT4"] as const;

function toNumber(value: string | null, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createNaverSearchUrl(name: string, address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(
    [name, address].filter(Boolean).join(" ")
  )}`;
}

function inferCategory(document: KakaoLocalDocument): PlaceCategory {
  const categoryText = `${document.category_group_name ?? ""} ${
    document.category_name ?? ""
  }`;

  if (document.category_group_code === "CE7") {
    return "카페";
  }

  if (/술집|주점|호프|맥주|소주|와인|이자카야|포차|바\b/i.test(categoryText)) {
    return "술집";
  }

  if (/디저트|베이커리|빵|케이크|도넛|아이스크림|빙수|초콜릿/i.test(categoryText)) {
    return "디저트";
  }

  if (document.category_group_code === "FD6") {
    return "밥집";
  }

  if (document.category_group_code === "CT1" || document.category_group_code === "AT4") {
    return "놀거리";
  }

  return "기타";
}

function normalizeDocument(document: KakaoLocalDocument) {
  const lat = Number(document.y);
  const lng = Number(document.x);
  const name = document.place_name?.trim() ?? "";
  const address = document.road_address_name || document.address_name || "";

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    id: document.id || `${name}-${lat}-${lng}`,
    name,
    address: document.address_name ?? "",
    roadAddress: document.road_address_name ?? "",
    category: document.category_name ?? "",
    categoryGroupName: document.category_group_name ?? "",
    distance: Number(document.distance) || 0,
    lat,
    lng,
    phone: document.phone ?? "",
    kakaoPlaceUrl: document.place_url ?? "",
    naverMapUrl: createNaverSearchUrl(name, address),
    inferredCategory: inferCategory(document)
  };
}

function isNearbyPlaceItem(item: ReturnType<typeof normalizeDocument>): item is NearbyPlaceItem {
  return item !== null;
}

async function fetchCategoryPlaces(
  categoryCode: (typeof NEARBY_CATEGORY_CODES)[number],
  lat: number,
  lng: number,
  radius: number,
  restApiKey: string
) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  url.searchParams.set("category_group_code", categoryCode);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("sort", "distance");
  url.searchParams.set("size", "6");

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${restApiKey}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `Kakao Local API ${response.status} (${categoryCode}) ${body}`
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data = (await response.json()) as { documents?: KakaoLocalDocument[] };
  return (data.documents ?? []).map(normalizeDocument).filter(isNearbyPlaceItem);
}

export async function GET(request: NextRequest) {
  const lat = toNumber(request.nextUrl.searchParams.get("lat"), Number.NaN);
  const lng = toNumber(request.nextUrl.searchParams.get("lng"), Number.NaN);
  const radius = clamp(toNumber(request.nextUrl.searchParams.get("radius"), 120), 30, 500);
  const restApiKey = process.env.KAKAO_REST_API_KEY;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "위도와 경도를 확인해주세요.", items: [] },
      { status: 400 }
    );
  }

  if (!restApiKey) {
    return NextResponse.json(
      {
        message:
          "카카오 로컬 REST API 키가 없습니다. KAKAO_REST_API_KEY를 .env.local에 추가해주세요.",
        items: []
      },
      { status: 501 }
    );
  }

  try {
    const categoryResults = await Promise.all(
      NEARBY_CATEGORY_CODES.map((categoryCode) =>
        fetchCategoryPlaces(categoryCode, lat, lng, radius, restApiKey)
      )
    );
    const deduped = new Map<string, NearbyPlaceItem>();

    categoryResults
      .flat()
      .forEach((item) => {
        const key = item.id || `${item.name}-${item.address || item.roadAddress}`;
        const current = deduped.get(key);

        if (!current || item.distance < current.distance) {
          deduped.set(key, item);
        }
      });

    const items = Array.from(deduped.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);

    return NextResponse.json({ items, radius });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    const detail =
      error instanceof Error ? error.message : "알 수 없는 오류";

    // 서버 콘솔에 원본 에러를 남겨 디버깅을 쉽게 한다.
    console.error("[kakao/nearby-places] fetch failed:", detail);

    let hint = "카카오 REST API 키와 카카오맵 활성화 상태를 확인해주세요.";
    if (status === 401) {
      hint =
        "카카오 키가 거부됐어요(401). REST API 키가 맞는지(자바스크립트/Admin 키 아님), 또는 .env.local 변경 후 dev 서버를 재시작했는지 확인해주세요.";
    } else if (status === 403) {
      hint =
        "카카오가 권한을 거부했어요(403). 카카오 개발자 콘솔에서 앱의 플랫폼/도메인 설정과 카카오맵 활성화를 확인해주세요.";
    } else if (status === 429) {
      hint = "카카오 호출 한도를 초과했어요(429). 잠시 후 다시 시도해주세요.";
    }

    return NextResponse.json(
      {
        message: `주변 장소 후보를 불러오지 못했습니다. ${hint}`,
        detail,
        items: []
      },
      { status: 502 }
    );
  }
}
