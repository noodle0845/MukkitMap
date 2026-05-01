"use client";

import { ExternalLink, Edit3, MapPin, Trash2 } from "lucide-react";
import { MoreMenu } from "@/components/ui/MoreMenu";
import type { Member, Place } from "@/lib/types";
import { getMemberColor, getMemberForPlace } from "@/lib/utils";

type PlaceListProps = {
  places: Place[];
  members: Member[];
  selectedPlaceId: string | null;
  onSelect: (placeId: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (place: Place) => void;
  totalCount?: number;
};

export function PlaceList({
  places,
  members,
  selectedPlaceId,
  onSelect,
  onEdit,
  onDelete,
  totalCount
}: PlaceListProps) {
  const empty = places.length === 0;
  const showCount = totalCount ?? places.length;

  return (
    <section className="panel flex h-full max-h-[calc(100vh-9rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
        <div>
          <h2 className="section-title">장소</h2>
          <p className="text-xs font-semibold text-slate-500">
            {totalCount && totalCount !== places.length
              ? `${places.length} / ${showCount}곳`
              : `${places.length}곳`}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <MapPin size={18} />
          </span>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            조건에 맞는 장소가 없어요
          </p>
          <p className="text-xs leading-5 text-slate-500">
            필터를 조정하거나 우하단의 + 장소 추가를 눌러보세요.
          </p>
        </div>
      ) : (
        <ul className="scroll-pretty flex-1 divide-y divide-[var(--border-soft)] overflow-auto">
          {places.map((place) => {
            const member = getMemberForPlace(place, members);
            const isSelected = selectedPlaceId === place.id;

            return (
              <li
                key={place.id}
                className={`group cursor-pointer px-5 py-4 transition ${
                  isSelected ? "bg-[var(--primary-soft)]" : "hover:bg-slate-50"
                }`}
                onClick={() => onSelect(place.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSelect(place.id);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getMemberColor(member) }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <span>{member?.nickname ?? "알 수 없음"}</span>
                      <span aria-hidden>·</span>
                      <span>{place.category}</span>
                    </div>
                    <h3 className="mt-1 truncate text-[15px] font-bold text-slate-900">
                      {place.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                      {place.address}
                    </p>
                    {place.comment ? (
                      <p className="mt-1.5 line-clamp-1 text-[13px] leading-5 text-slate-600">
                        {place.comment}
                      </p>
                    ) : null}
                    {place.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {place.tags.slice(0, 3).map((tag) => (
                          <span
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500"
                            key={tag}
                          >
                            #{tag}
                          </span>
                        ))}
                        {place.tags.length > 3 ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">
                            +{place.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="ml-1 shrink-0"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreMenu
                      items={[
                        {
                          label: "지도 보기",
                          icon: <ExternalLink size={14} />,
                          onSelect: () => {
                            window.open(place.naverMapUrl, "_blank", "noopener,noreferrer");
                          }
                        },
                        {
                          label: "수정",
                          icon: <Edit3 size={14} />,
                          onSelect: () => onEdit(place)
                        },
                        {
                          label: "삭제",
                          icon: <Trash2 size={14} />,
                          danger: true,
                          onSelect: () => onDelete(place)
                        }
                      ]}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
