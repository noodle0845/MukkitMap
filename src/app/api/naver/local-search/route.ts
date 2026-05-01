import { NextRequest, NextResponse } from "next/server";
import type { NaverLocalSearchItem, PlaceCategory } from "@/lib/types";

type NaverLocalApiItem = {
  title?: string;
  link?: string;
  category?: string;
  description?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string | number;
  mapy?: string | number;
};

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeCoordinate(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.abs(numeric) > 1000 ? numeric / 10000000 : numeric;
}

function createSearchUrl(title: string, address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(
    [title, address].filter(Boolean).join(" ")
  )}`;
}

function categoryFromNaver(category: string): PlaceCategory {
  if (/카페|커피|찻집/i.test(category)) {
    return "카페";
  }

  if (/술집|주점|맥주|와인|바|포차|호프/i.test(category)) {
    return "술집";
  }

  if (/디저트|베이커리|케이크|아이스크림|도넛|빵/i.test(category)) {
    return "디저트";
  }

  if (/공원|테마파크|영화|전시|문화|놀거리|오락|볼링|방탈출/i.test(category)) {
    return "놀거리";
  }

  if (/음식|한식|일식|중식|양식|분식|초밥|고기|국밥|요리|레스토랑/i.test(category)) {
    return "밥집";
  }

  return "기타";
}

function toSearchItem(item: NaverLocalApiItem): NaverLocalSearchItem {
  const title = stripHtml(item.title);
  const category = stripHtml(item.category);
  const address = stripHtml(item.roadAddress || item.address);
  const lat = normalizeCoordinate(item.mapy);
  const lng = normalizeCoordinate(item.mapx);

  return {
    title,
    link: item.link ?? "",
    category,
    description: stripHtml(item.description),
    address,
    roadAddress: stripHtml(item.roadAddress),
    lat,
    lng,
    naverMapUrl: item.link || createSearchUrl(title, address)
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { message: "검색어를 두 글자 이상 입력해주세요.", items: [] },
      { status: 400 }
    );
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        message:
          "네이버 지역 검색 API 키가 없습니다. NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET을 .env.local에 추가해주세요.",
        items: []
      },
      { status: 501 }
    );
  }

  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "random");

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret
    }
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        message: "네이버 지역 검색에 실패했습니다. API 권한과 키를 확인해주세요.",
        items: []
      },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { items?: NaverLocalApiItem[] };
  const items = (data.items ?? []).map(toSearchItem).map((item) => ({
    ...item,
    inferredCategory: categoryFromNaver(item.category)
  }));

  return NextResponse.json({ items });
}
