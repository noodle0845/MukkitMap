"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import type { Member, PickedLocation, Place } from "@/lib/types";
import {
  createNaverCoordinateUrl,
  DEFAULT_CENTER,
  getMemberForPlace,
  safeMarkerColor
} from "@/lib/utils";

type MapViewProps = {
  places: Place[];
  members: Member[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  onOpenDetail?: (placeId: string) => void;
  onPickLocation?: (location: PickedLocation) => void;
  mukkitPickPlaceIds?: string[];
};

function createMarkerIcon(color: string, selected: boolean, highlighted: boolean) {
  const markerColor = safeMarkerColor(color);
  const size = selected ? 28 : 22;
  const border = selected ? 4 : 3;
  const iconSize = highlighted ? size + 14 : size;
  const badge = highlighted
    ? `<span style="
        position:absolute;
        right:-7px;
        top:-8px;
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
        box-shadow:0 6px 14px rgba(245,158,11,0.32);
      ">★</span>`
    : "";

  return L.divIcon({
    className: "mukkit-marker",
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;">
      <span style="
        display:block;
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        background:${markerColor};
        border:${border}px solid white;
        box-shadow:0 8px 18px rgba(15,23,42,0.22);
      "></span>
      ${badge}
    </span>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

function FitVisiblePlaces({
  places,
  selectedPlaceId
}: {
  places: Place[];
  selectedPlaceId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      const selectedPlace = places.find((place) => place.id === selectedPlaceId);
      if (selectedPlace) {
        map.flyTo([selectedPlace.lat, selectedPlace.lng], Math.max(map.getZoom(), 14), {
          duration: 0.55
        });
        return;
      }

      if (places.length === 0) {
        map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
        return;
      }

      if (places.length === 1) {
        map.setView([places[0].lat, places[0].lng], 14);
        return;
      }

      const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lng]));
      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 14
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [map, places, selectedPlaceId]);

  return null;
}

function LeafletLocationPicker({
  onPickLocation
}: {
  onPickLocation?: (location: PickedLocation) => void;
}) {
  useMapEvents({
    click(event) {
      if (!onPickLocation) {
        return;
      }

      onPickLocation({
        address: `지도에서 선택한 위치 (${Number(event.latlng.lat.toFixed(7))}, ${Number(
          event.latlng.lng.toFixed(7)
        )})`,
        lat: Number(event.latlng.lat.toFixed(7)),
        lng: Number(event.latlng.lng.toFixed(7)),
        naverMapUrl: createNaverCoordinateUrl(event.latlng.lat, event.latlng.lng)
      });
    }
  });

  return null;
}

export function MapView({
  places,
  members,
  selectedPlaceId,
  onSelectPlace,
  onOpenDetail,
  onPickLocation,
  mukkitPickPlaceIds = []
}: MapViewProps) {
  const mukkitPickSet = useMemo(
    () => new Set(mukkitPickPlaceIds),
    [mukkitPickPlaceIds]
  );

  const markerData = useMemo(
    () =>
      places.map((place) => {
        const member = getMemberForPlace(place, members);
        const isMukkitPick = mukkitPickSet.has(place.id);

        return {
          place,
          member,
          isMukkitPick,
          icon: createMarkerIcon(
            member?.markerColor ?? "#64748b",
            selectedPlaceId === place.id,
            isMukkitPick
          )
        };
      }),
    [members, mukkitPickSet, places, selectedPlaceId]
  );

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-3.5">
        <div>
          <h2 className="section-title">지도</h2>
          <p className="text-[12px] font-semibold text-slate-500">
            마커는 추천자 색상을 따릅니다
          </p>
        </div>
        <span className="pill">{places.length}곳</span>
      </div>

      <div className="h-[460px] lg:h-[640px]">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          className="h-full w-full"
          scrollWheelZoom
          zoom={12}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitVisiblePlaces places={places} selectedPlaceId={selectedPlaceId} />
          <LeafletLocationPicker onPickLocation={onPickLocation} />

          {markerData.map(({ place, member, icon, isMukkitPick }) => (
            <Marker
              eventHandlers={{
                click: () => onSelectPlace(place.id)
              }}
              icon={icon}
              key={place.id}
              position={[place.lat, place.lng]}
            >
              {places.length <= 12 ? (
                <Tooltip direction="top" offset={[0, -14]} opacity={0.95} permanent>
                  {place.name}
                </Tooltip>
              ) : null}
              <Popup>
                <div
                  style={{
                    minWidth: 240,
                    maxWidth: 280,
                    padding: "4px 2px",
                    fontFamily:
                      '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif'
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em"
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background:
                          member?.markerColor ?? "#64748b"
                      }}
                    />
                    <span>{member?.nickname ?? "알 수 없음"}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{place.category}</span>
                  </div>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.3
                    }}
                  >
                    {place.name}
                  </p>
                  {isMukkitPick ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        marginTop: 6,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "#fef3c7",
                        color: "#b45309",
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      ★ 먹킷각
                    </span>
                  ) : null}
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.5
                    }}
                  >
                    {place.address}
                  </p>

                  {place.comment ? (
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#475569",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {place.comment}
                    </p>
                  ) : null}

                  {place.tags.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        marginTop: 8
                      }}
                    >
                      {place.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <a
                      href={place.naverMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "#10b981",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none"
                      }}
                    >
                      지도 보기
                    </a>
                    <button
                      type="button"
                      onClick={() => onOpenDetail?.(place.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "#fff",
                        color: "#475569",
                        fontSize: 13,
                        fontWeight: 700,
                        border: "1px solid #e2e8f0",
                        cursor: "pointer"
                      }}
                    >
                      상세
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
