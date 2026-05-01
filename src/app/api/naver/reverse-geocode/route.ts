import { NextRequest, NextResponse } from "next/server";

type NaverReverseResult = {
  name?: string;
  region?: {
    area1?: { name?: string };
    area2?: { name?: string };
    area3?: { name?: string };
    area4?: { name?: string };
  };
  land?: {
    name?: string;
    number1?: string;
    number2?: string;
    addition0?: { value?: string };
    addition1?: { value?: string };
  };
};

type NaverReverseResponse = {
  status?: {
    code?: number;
    message?: string;
    name?: string;
  };
  results?: NaverReverseResult[];
};

function joinAddress(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function formatLandNumber(land?: NaverReverseResult["land"]) {
  if (!land?.number1) {
    return "";
  }

  return land.number2 ? `${land.number1}-${land.number2}` : land.number1;
}

function addressFromResult(result?: NaverReverseResult) {
  if (!result) {
    return "";
  }

  return joinAddress([
    result.region?.area1?.name,
    result.region?.area2?.name,
    result.region?.area3?.name,
    result.region?.area4?.name,
    result.land?.name,
    formatLandNumber(result.land),
    result.land?.addition0?.value,
    result.land?.addition1?.value
  ]);
}

function addressFromReverseResponse(data: NaverReverseResponse) {
  const results = data.results ?? [];
  const preferred =
    results.find((result) => result.name === "roadaddr") ??
    results.find((result) => result.name === "addr") ??
    results[0];

  return addressFromResult(preferred);
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { address: "", message: "위도와 경도를 숫자로 보내주세요." },
      { status: 400 }
    );
  }

  const clientId =
    process.env.NAVER_MAP_CLIENT_ID ?? process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret =
    process.env.NAVER_MAP_CLIENT_SECRET ??
    process.env.NAVER_MAP_API_KEY ??
    process.env.NCP_APIGW_API_KEY;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        address: "",
        message:
          "NAVER_MAP_CLIENT_SECRET 또는 NAVER_MAP_API_KEY가 없어 브라우저 역지오코딩으로 확인합니다."
      },
      { status: 501 }
    );
  }

  const url = new URL(
    "https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc"
  );
  url.searchParams.set("request", "coordsToaddr");
  url.searchParams.set("coords", `${lng},${lat}`);
  url.searchParams.set("sourcecrs", "epsg:4326");
  url.searchParams.set("targetcrs", "epsg:4326");
  url.searchParams.set("orders", "roadaddr,addr,admcode,legalcode");
  url.searchParams.set("output", "json");

  const response = await fetch(url, {
    headers: {
      "X-NCP-APIGW-API-KEY": clientSecret,
      "X-NCP-APIGW-API-KEY-ID": clientId
    }
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        address: "",
        message:
          response.status === 429
            ? "Maps Application에서 Reverse Geocoding API 권한을 켜주세요."
            : "네이버 Reverse Geocoding API 요청에 실패했습니다."
      },
      { status: response.status }
    );
  }

  const data = (await response.json()) as NaverReverseResponse;
  const isOk = data.status?.code === 0 || data.status?.name === "ok";

  if (!isOk) {
    return NextResponse.json(
      {
        address: "",
        message:
          data.status?.message ??
          "네이버 Reverse Geocoding API 응답을 확인하지 못했습니다."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    address: addressFromReverseResponse(data),
    message: ""
  });
}
