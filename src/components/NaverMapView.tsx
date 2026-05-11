"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Member, PickedLocation, Place, PlaceCategory } from "@/lib/types";
import {
  createNaverCoordinateUrl,
  DEFAULT_CENTER,
  getMemberForPlace,
  safeMarkerColor
} from "@/lib/utils";

type NaverMapViewProps = {
  places: Place[];
  members: Member[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  onOpenDetail?: (placeId: string) => void;
  onPickLocation?: (location: PickedLocation) => void;
  mukkitPickPlaceIds?: string[];
};

type NearbyPlaceCandidate = {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  category: string;
  categoryGroupName: string;
  distance: number;
  lat: number;
  lng: number;
  phone: string;
  kakaoPlaceUrl: string;
  naverMapUrl: string;
  inferredCategory: PlaceCategory;
};

declare global {
  interface Window {
    naver?: {
      maps?: any;
    };
    __mukkitNaverMapsPromise?: Promise<any>;
  }
}

function loadNaverMaps(clientId: string) {
  if (window.naver?.maps?.Map) {
    return Promise.resolve(window.naver.maps);
  }

  if (window.__mukkitNaverMapsPromise) {
    return window.__mukkitNaverMapsPromise;
  }

  window.__mukkitNaverMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("naver-map-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.naver?.maps));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "naver-map-script";
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
      clientId
    )}&submodules=geocoder&language=ko`;
    script.onload = () => {
      if (window.naver?.maps?.Map) {
        resolve(window.naver.maps);
        return;
      }

      reject(new Error("네이버 지도 API를 불러오지 못했습니다."));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__mukkitNaverMapsPromise;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function categoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "밥집": "🍽",
    "카페": "☕",
    "술집": "🍺",
    "디저트": "🍰",
    "놀거리": "🎮",
    "기타": "✨",
  };
  return map[category] ?? "📌";
}

function mukkitPickBadge() {
  return `<span style="
    position:absolute;
    right:-7px;
    top:-7px;
    display:flex;
    width:18px;
    height:18px;
    align-items:center;
    justify-content:center;
    border-radius:999px;
    background:#f59e0b;
    color:white;
    border:2px solid white;
    font-size:11px;
    font-weight:900;
    box-shadow:0 6px 14px rgba(245,158,11,0.35);
    pointer-events:none;
  ">★</span>`;
}

function markerContent(place: Place, color: string, selected: boolean, showLabel: boolean, highlighted = false) {
  const sc = safeMarkerColor(color);
  const emoji = categoryEmoji(place.category);
  const badge = highlighted ? mukkitPickBadge() : "";

  if (selected) {
    // 선택 상태: 큰 핀 + 글로우 + 이름 라벨 항상 표시
    const label = `<span style="
        display:inline-flex;align-items:center;
        max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
        border-radius:999px;background:white;
        padding:4px 11px;font-size:12px;font-weight:800;color:#0f172a;
        box-shadow:0 2px 14px rgba(15,23,42,0.18);
        border:2.5px solid ${sc};
        align-self:flex-end;margin-bottom:8px;
      ">${escapeHtml(place.name)}</span>`;

    return `<div style="display:flex;align-items:flex-end;gap:8px;">
      <div style="position:relative;width:34px;height:44px;flex-shrink:0;">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none"
          style="filter:drop-shadow(0 6px 18px ${sc}99) drop-shadow(0 2px 6px rgba(15,23,42,0.32));">
          <path d="M17 2C9.82 2 4 7.82 4 15C4 25.56 17 42 17 42S30 25.56 30 15C30 7.82 24.18 2 17 2Z"
            fill="${sc}" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="17" cy="14" r="8.5" fill="white" fill-opacity="0.97"/>
        </svg>
        <span style="
          position:absolute;top:5.5px;left:0;width:34px;height:17px;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;line-height:1;pointer-events:none;
        ">${emoji}</span>
        ${badge}
      </div>
      ${label}
    </div>`;
  }

  // 기본 상태: 일반 핀 + 선택적 라벨
  const label = showLabel
    ? `<span style="
        display:inline-flex;align-items:center;
        max-width:150px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
        border-radius:999px;background:white;
        padding:2px 8px;font-size:11px;font-weight:800;color:#0f172a;
        box-shadow:0 2px 8px rgba(15,23,42,0.14);
        align-self:flex-end;margin-bottom:5px;
      ">${escapeHtml(place.name)}</span>`
    : "";

  return `<div style="display:flex;align-items:flex-end;gap:5px;">
    <div style="position:relative;width:26px;height:34px;flex-shrink:0;">
      <svg width="26" height="34" viewBox="0 0 26 34" fill="none"
        style="filter:drop-shadow(0 3px 8px rgba(15,23,42,0.26));">
        <path d="M13 2C7.477 2 3 6.477 3 12C3 20.4 13 32 13 32S23 20.4 23 12C23 6.477 18.523 2 13 2Z"
          fill="${sc}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="13" cy="11.5" r="6.5" fill="white" fill-opacity="0.95"/>
      </svg>
      <span style="
        position:absolute;top:5px;left:0;width:26px;height:13px;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;line-height:1;pointer-events:none;
      ">${emoji}</span>
      ${badge}
    </div>
    ${label}
  </div>`;
}

function richInfoContent(place: Place, member: Member | undefined, highlighted = false) {
  const memberColor = safeMarkerColor(member?.markerColor);
  const memberName = escapeHtml(member?.nickname ?? "알 수 없음");
  const emoji = categoryEmoji(place.category);
  const tagsHtml = place.tags
    .slice(0, 3)
    .map(
      (tag) =>
        `<span style="display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;">#${escapeHtml(tag)}</span>`
    )
    .join("");

  const memoHtml = place.comment
    ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#475569;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(place.comment)}</p>`
    : "";

  return `<div style="font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;min-width:240px;max-width:280px;padding:6px 4px;">
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.04em;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${memberColor};flex-shrink:0;"></span>
      <span>${memberName}</span>
      <span style="opacity:.4;">·</span>
      <span>${emoji} ${escapeHtml(place.category)}</span>
    </div>
    <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#0f172a;line-height:1.3;">${escapeHtml(place.name)}</p>
    ${highlighted ? `<span style="display:inline-flex;align-items:center;margin-top:6px;padding:3px 8px;border-radius:999px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:800;">★ 먹킷각</span>` : ""}
    <p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(place.address)}</p>
    ${memoHtml}
    ${tagsHtml ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">${tagsHtml}</div>` : ""}
    <div style="display:flex;gap:6px;margin-top:12px;">
      <a href="${escapeHtml(place.naverMapUrl)}" target="_blank" rel="noreferrer" style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:8px 10px;border-radius:10px;background:#10b981;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">지도 보기</a>
      <button type="button" data-mukkit-action="detail" data-place-id="${escapeHtml(place.id)}" style="padding:8px 12px;border-radius:10px;background:#fff;color:#475569;font-size:13px;font-weight:700;border:1px solid #e2e8f0;cursor:pointer;">상세</button>
    </div>
  </div>`;
}

function pickedMarkerContent() {
  return `<div style="display:flex;align-items:flex-end;gap:6px;">
    <div style="position:relative;width:30px;height:38px;flex-shrink:0;">
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none"
        style="filter:drop-shadow(0 5px 14px rgba(16,185,129,0.55)) drop-shadow(0 2px 5px rgba(15,23,42,0.28));">
        <path d="M15 2C9.477 2 5 6.477 5 12C5 21 15 36 15 36S25 21 25 12C25 6.477 20.523 2 15 2Z"
          fill="#10b981" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="15" cy="11.5" r="7" fill="white" fill-opacity="0.97"/>
      </svg>
      <span style="
        position:absolute;top:4.5px;left:0;width:30px;height:14px;
        display:flex;align-items:center;justify-content:center;
        font-size:12px;line-height:1;pointer-events:none;
      ">📍</span>
    </div>
    <span style="
      display:inline-flex;align-items:center;
      border-radius:999px;background:white;
      padding:3px 10px;font-size:12px;font-weight:800;color:#0f172a;
      box-shadow:0 2px 10px rgba(15,23,42,0.16);
      border:2px solid #10b981;
      align-self:flex-end;margin-bottom:4px;
    ">선택 위치</span>
  </div>`;
}

function fitPlaces(maps: any, map: any, places: Place[], selectedPlaceId: string | null) {
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);

  if (selectedPlace) {
    map.panTo(new maps.LatLng(selectedPlace.lat, selectedPlace.lng));
    map.setZoom(Math.max(map.getZoom(), 14));
    return;
  }

  if (places.length === 0) {
    map.setCenter(new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
    map.setZoom(12);
    return;
  }

  if (places.length === 1) {
    map.setCenter(new maps.LatLng(places[0].lat, places[0].lng));
    map.setZoom(14);
    return;
  }

  const minLat = Math.min(...places.map((place) => place.lat));
  const maxLat = Math.max(...places.map((place) => place.lat));
  const minLng = Math.min(...places.map((place) => place.lng));
  const maxLng = Math.max(...places.map((place) => place.lng));
  const bounds = new maps.LatLngBounds(
    new maps.LatLng(minLat, minLng),
    new maps.LatLng(maxLat, maxLng)
  );

  map.fitBounds(bounds);
}

function getLatLngFromNaverCoord(coord: any) {
  const lat = typeof coord.lat === "function" ? coord.lat() : coord.y ?? coord.lat;
  const lng = typeof coord.lng === "function" ? coord.lng() : coord.x ?? coord.lng;

  return {
    lat: Number(Number(lat).toFixed(7)),
    lng: Number(Number(lng).toFixed(7))
  };
}

type ReverseGeocodeResult = {
  address: string;
  errorMessage?: string;
};

function normalizeAddressParts(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function addressFromReverseGeocodeResponse(response: any) {
  const v2Address = response?.v2?.address;

  if (v2Address?.roadAddress) {
    return v2Address.roadAddress;
  }

  if (v2Address?.jibunAddress) {
    return v2Address.jibunAddress;
  }

  const firstResult = response?.v2?.results?.[0] ?? response?.result?.items?.[0];

  if (firstResult?.address) {
    return firstResult.address;
  }

  if (firstResult?.land?.addition0?.value) {
    const regionAddress = normalizeAddressParts([
      firstResult?.region?.area1?.name,
      firstResult?.region?.area2?.name,
      firstResult?.region?.area3?.name,
      firstResult?.region?.area4?.name,
      firstResult.land.name,
      firstResult.land.number1,
      firstResult.land.number2 ? `-${firstResult.land.number2}` : undefined,
      firstResult.land.addition0.value
    ]);

    if (regionAddress) {
      return regionAddress;
    }
  }

  if (firstResult?.land) {
    const landAddress = normalizeAddressParts([
      firstResult?.region?.area1?.name,
      firstResult?.region?.area2?.name,
      firstResult?.region?.area3?.name,
      firstResult?.region?.area4?.name,
      firstResult.land.name,
      firstResult.land.number1,
      firstResult.land.number2 ? `-${firstResult.land.number2}` : undefined
    ]);

    if (landAddress) {
      return landAddress;
    }
  }

  const region = firstResult?.region;
  const regionAddress = normalizeAddressParts([
    region?.area1?.name,
    region?.area2?.name,
    region?.area3?.name,
    region?.area4?.name
  ]);

  return regionAddress;
}

async function reverseGeocodeWithServer(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/naver/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = (await response.json()) as {
      address?: string;
      message?: string;
    };

    if (response.status === 501) {
      return null;
    }

    return {
      address: data.address ?? "",
      errorMessage: data.message
    };
  } catch {
    return null;
  }
}

function reverseGeocodeWithNaverService(maps: any, lat: number, lng: number) {
  return new Promise<ReverseGeocodeResult>((resolve) => {
    if (!maps.Service?.reverseGeocode) {
      resolve({
        address: "",
        errorMessage: "네이버 지도 역지오코딩 모듈을 불러오지 못했습니다."
      });
      return;
    }

    const coord = new maps.LatLng(lat, lng);

    maps.Service.reverseGeocode(
      {
        coords: coord,
        location: coord,
        orders: [
          maps.Service.OrderType?.ROAD_ADDR ?? "roadaddr",
          maps.Service.OrderType?.ADDR ?? "addr"
        ].join(",")
      },
      (status: number | string, response: any) => {
        const okStatus = maps.Service.Status?.OK;
        const isOk =
          status === okStatus ||
          status === "OK" ||
          status === 0 ||
          status === 200 ||
          response?.v2?.status?.code === 0 ||
          response?.v2?.status?.name === "ok";

        if (!isOk) {
          resolve({
            address: "",
            errorMessage:
              response?.v2?.status?.message ||
              "네이버 지도 Reverse Geocoding API 권한을 확인해주세요."
          });
          return;
        }

        resolve({
          address: addressFromReverseGeocodeResponse(response) ?? "",
          errorMessage: response?.v2?.errorMessage
        });
      }
    );
  });
}

async function reverseGeocode(maps: any, lat: number, lng: number) {
  const serverResult = await reverseGeocodeWithServer(lat, lng);

  if (serverResult?.address) {
    return serverResult;
  }

  const clientResult = await reverseGeocodeWithNaverService(maps, lat, lng);

  if (clientResult.address) {
    return clientResult;
  }

  return serverResult ?? clientResult;
}

async function searchNearbyPlaces(lat: number, lng: number) {
  try {
    const response = await fetch(
      `/api/kakao/nearby-places?lat=${lat}&lng=${lng}&radius=140`
    );
    const data = (await response.json()) as {
      items?: NearbyPlaceCandidate[];
      message?: string;
    };

    return {
      items: data.items ?? [],
      message: response.ok ? data.message ?? "" : data.message ?? ""
    };
  } catch {
    return {
      items: [],
      message: "주변 장소 후보를 불러오지 못했습니다."
    };
  }
}

function pickedLocationFromNearbyPlace(candidate: NearbyPlaceCandidate): PickedLocation {
  const address = candidate.roadAddress || candidate.address;

  return {
    address,
    category: candidate.inferredCategory,
    lat: candidate.lat,
    lng: candidate.lng,
    name: candidate.name,
    naverMapUrl:
      candidate.naverMapUrl ||
      createNaverCoordinateUrl(candidate.lat, candidate.lng, `${candidate.name} ${address}`),
    tags: candidate.categoryGroupName ? [candidate.categoryGroupName] : []
  };
}

export function NaverMapView({
  places,
  members,
  selectedPlaceId,
  onSelectPlace,
  onOpenDetail,
  onPickLocation,
  mukkitPickPlaceIds = []
}: NaverMapViewProps) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const listenersRef = useRef<any[]>([]);
  const mapClickListenerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const pickedMarkerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pickedCandidate, setPickedCandidate] = useState<PickedLocation | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressResolveMessage, setAddressResolveMessage] = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceCandidate[]>([]);
  const [isLoadingNearbyPlaces, setIsLoadingNearbyPlaces] = useState(false);
  const [nearbyPlacesMessage, setNearbyPlacesMessage] = useState("");
  const mukkitPickSet = useMemo(
    () => new Set(mukkitPickPlaceIds),
    [mukkitPickPlaceIds]
  );

  const dismissPickedCandidate = useCallback(() => {
    setPickedCandidate(null);
    setNearbyPlaces([]);
    setNearbyPlacesMessage("");
    setAddressResolveMessage("");
    setIsResolvingAddress(false);
    setIsLoadingNearbyPlaces(false);
    if (pickedMarkerRef.current) {
      pickedMarkerRef.current.setMap(null);
      pickedMarkerRef.current = null;
    }
  }, []);

  // Esc 키로도 닫히게.
  useEffect(() => {
    if (!pickedCandidate) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissPickedCandidate();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickedCandidate, dismissPickedCandidate]);

  const markerData = useMemo(
    () =>
      places.map((place) => {
        const member = getMemberForPlace(place, members);

        return {
          member,
          place,
          isMukkitPick: mukkitPickSet.has(place.id)
        };
      }),
    [members, mukkitPickSet, places]
  );

  useEffect(() => {
    if (!clientId || !mapElementRef.current) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    loadNaverMaps(clientId)
      .then((maps) => {
        if (cancelled || !mapElementRef.current) {
          return;
        }

        mapsRef.current = maps;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapElementRef.current, {
            center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: maps.Position.TOP_RIGHT
            },
            zoom: 12,
            zoomControl: true,
            zoomControlOptions: {
              position: maps.Position.TOP_LEFT
            }
          });
        }

        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;

    if (status !== "ready" || !maps || !map) {
      return;
    }

    listenersRef.current.forEach((listener) => maps.Event.removeListener(listener));
    markersRef.current.forEach((marker) => marker.setMap(null));
    listenersRef.current = [];
    markersRef.current = [];
    infoWindowRef.current?.close();

    markerData.forEach(({ place, member, isMukkitPick }) => {
      const selected = selectedPlaceId === place.id;
      const marker = new maps.Marker({
        icon: {
          // 핀 끝(bottom-center)이 좌표에 오도록 anchor 설정
          anchor: new maps.Point(selected ? 17 : 13, selected ? 44 : 34),
          content: markerContent(
            place,
            member?.markerColor ?? "#64748b",
            selected,
            places.length <= 12,
            isMukkitPick
          )
        },
        map,
        position: new maps.LatLng(place.lat, place.lng),
        zIndex: selected ? 200 : 100
      });

      const listener = maps.Event.addListener(marker, "click", () => {
        onSelectPlace(place.id);
        infoWindowRef.current?.close();
        infoWindowRef.current = new maps.InfoWindow({
          content: richInfoContent(place, member, isMukkitPick),
          borderWidth: 0,
          backgroundColor: "transparent",
          disableAnchor: false,
          pixelOffset: new maps.Point(0, -6)
        });
        infoWindowRef.current.open(map, marker);
      });

      listenersRef.current.push(listener);
      markersRef.current.push(marker);
    });

    window.setTimeout(() => fitPlaces(maps, map, places, selectedPlaceId), 80);
  }, [markerData, onSelectPlace, places, selectedPlaceId, status]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;

    if (status !== "ready" || !maps || !map || !onPickLocation) {
      return;
    }

    if (mapClickListenerRef.current) {
      maps.Event.removeListener(mapClickListenerRef.current);
    }

    mapClickListenerRef.current = maps.Event.addListener(map, "click", async (event: any) => {
      const { lat, lng } = getLatLngFromNaverCoord(event.coord);
      const initialCandidate = {
        address: "",
        lat,
        lng,
        name: "",
        naverMapUrl: createNaverCoordinateUrl(lat, lng)
      };

      setPickedCandidate(initialCandidate);
      setIsResolvingAddress(true);
      setAddressResolveMessage("");
      setNearbyPlaces([]);
      setIsLoadingNearbyPlaces(true);
      setNearbyPlacesMessage("");

      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.setMap(null);
      }

      pickedMarkerRef.current = new maps.Marker({
        icon: {
          anchor: new maps.Point(15, 38),
          content: pickedMarkerContent()
        },
        map,
        position: new maps.LatLng(lat, lng),
        zIndex: 300
      });

      const [result, nearbyResult] = await Promise.all([
        reverseGeocode(maps, lat, lng),
        searchNearbyPlaces(lat, lng)
      ]);
      setIsResolvingAddress(false);
      setAddressResolveMessage(result.errorMessage ?? "");
      setIsLoadingNearbyPlaces(false);
      setNearbyPlaces(nearbyResult.items);
      setNearbyPlacesMessage(nearbyResult.message);
      setPickedCandidate({
        address: result.address,
        lat,
        lng,
        name: "",
        naverMapUrl: createNaverCoordinateUrl(lat, lng, result.address)
      });
    });

    return () => {
      if (mapClickListenerRef.current) {
        maps.Event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, [onPickLocation, status]);

  useEffect(() => {
    return () => {
      const maps = mapsRef.current;

      if (maps) {
        listenersRef.current.forEach((listener) => maps.Event.removeListener(listener));
        if (mapClickListenerRef.current) {
          maps.Event.removeListener(mapClickListenerRef.current);
        }
      }

      markersRef.current.forEach((marker) => marker.setMap(null));
      pickedMarkerRef.current?.setMap(null);
      infoWindowRef.current?.close();
    };
  }, []);

  // InfoWindow 안의 [상세] 버튼 — Naver InfoWindow는 HTML string content라 이벤트 위임으로 처리.
  useEffect(() => {
    if (!onOpenDetail) return;

    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest(
        '[data-mukkit-action="detail"]'
      ) as HTMLElement | null;
      if (!trigger) return;
      const placeId = trigger.getAttribute("data-place-id");
      if (!placeId) return;
      event.preventDefault();
      onOpenDetail(placeId);
      infoWindowRef.current?.close();
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onOpenDetail]);

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
        <div>
          <h2 className="section-title">지도</h2>
          <p className="text-[12px] font-semibold text-slate-500">
            네이버 지도 위에 추천자 색상으로 표시됩니다
          </p>
        </div>
        <span className="pill">{places.length}곳</span>
      </div>

      <div className="relative h-[460px] lg:h-[640px]">
        <div className="h-full w-full" ref={mapElementRef} />

        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-bold text-slate-500">
            네이버 지도 불러오는 중
          </div>
        ) : null}

        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6 text-center text-sm font-bold leading-6 text-red-600">
            네이버 지도를 불러오지 못했습니다. Client ID와 Web 서비스 URL을 확인해주세요.
          </div>
        ) : null}

        {pickedCandidate ? (
          <div className="absolute bottom-3 left-3 right-3 max-h-[62%] overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-4 pr-12 shadow-pop">
            <button
              className="icon-button absolute right-3 top-3 z-10 h-8 w-8 border-transparent bg-white/80 text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700"
              onClick={dismissPickedCandidate}
              type="button"
              title="닫기"
              aria-label="선택한 위치 닫기"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="caption text-emerald-700">선택한 위치</p>
                <p className="mt-1 text-[14px] leading-6 text-slate-700">
                  {isResolvingAddress
                    ? "주소 찾는 중…"
                    : pickedCandidate.address ||
                      addressResolveMessage ||
                      "주소를 찾지 못했습니다."}
                </p>
              </div>
              <button
                className="btn-ghost shrink-0"
                onClick={() =>
                  onPickLocation?.({
                    ...pickedCandidate,
                    address:
                      pickedCandidate.address || "지도에서 선택한 위치",
                    naverMapUrl:
                      pickedCandidate.naverMapUrl ||
                      createNaverCoordinateUrl(pickedCandidate.lat, pickedCandidate.lng)
                  })
                }
                type="button"
              >
                직접 입력
              </button>
            </div>

            <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="caption text-slate-500">주변 장소 후보</p>
                {isLoadingNearbyPlaces ? (
                  <span className="text-[12px] font-bold text-emerald-600">
                    찾는 중
                  </span>
                ) : null}
              </div>

              {nearbyPlaces.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {nearbyPlaces.map((candidate) => {
                    const address = candidate.roadAddress || candidate.address;

                    return (
                      <button
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                        key={candidate.id}
                        onClick={() => onPickLocation?.(pickedLocationFromNearbyPlace(candidate))}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-extrabold text-slate-900">
                              {candidate.name}
                            </p>
                            <p className="mt-1 truncate text-[12px] font-semibold text-slate-500">
                              {address || candidate.category}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
                            {candidate.distance ? `${candidate.distance}m` : "근처"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : !isLoadingNearbyPlaces ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] font-semibold leading-6 text-slate-500">
                  {nearbyPlacesMessage ||
                    "근처 장소 후보가 없으면 직접 입력으로 등록해주세요."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
