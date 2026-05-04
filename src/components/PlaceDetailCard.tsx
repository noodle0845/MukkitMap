"use client";

import { ExternalLink, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Member, Place } from "@/lib/types";
import { getMemberColor } from "@/lib/utils";

type PlaceDetailCardProps = {
  place: Place;
  member?: Member;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function PlaceDetailCard({
  place,
  member,
  onEdit,
  onDelete
}: PlaceDetailCardProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getMemberColor(member) }}
            aria-hidden
          />
          <span>{member?.nickname ?? "알 수 없음"} 추천</span>
          <span aria-hidden>·</span>
          <span>{place.category}</span>
        </div>
        <h2 className="mt-3 text-[22px] font-bold leading-tight text-slate-900">
          {place.name}
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-500">
          <MapPin size={15} className="mt-1 shrink-0" />
          {place.address}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-4">
        <p className="caption">메모</p>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">
          {place.comment || "아직 메모가 없습니다."}
        </p>
      </div>

      {place.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-600"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <a
          className="btn-primary flex-1"
          href={place.naverMapUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={16} />
          지도 보기
        </a>
        {onEdit ? (
          <button className="btn-ghost" onClick={onEdit} type="button">
            <Pencil size={15} />
            수정
          </button>
        ) : null}
        {onDelete ? (
          <button className="btn-danger" onClick={onDelete} type="button">
            <Trash2 size={15} />
            삭제
          </button>
        ) : null}
      </div>
    </div>
  );
}
