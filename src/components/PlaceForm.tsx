"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  PLACE_CATEGORIES,
  type Member,
  type PickedLocation,
  type Place,
  type PlaceCreateInput
} from "@/lib/types";
import { DEFAULT_CENTER, isValidHttpUrl, parseTags, tagsToInput } from "@/lib/utils";

type PlaceFormProps = {
  members: Member[];
  initialPlace?: Place | null;
  pickedLocation?: PickedLocation | null;
  onSubmit: (input: PlaceCreateInput) => void;
  onCancelEdit?: () => void;
};

type PlaceFormState = {
  memberId: string;
  name: string;
  naverMapUrl: string;
  address: string;
  lat: string;
  lng: string;
  category: PlaceCreateInput["category"];
  tags: string;
  comment: string;
};

function createInitialState(
  members: Member[],
  initialPlace?: Place | null
): PlaceFormState {
  return {
    memberId: initialPlace?.memberId ?? members[0]?.id ?? "",
    name: initialPlace?.name ?? "",
    naverMapUrl: initialPlace?.naverMapUrl ?? "",
    address: initialPlace?.address ?? "",
    lat: String(initialPlace?.lat ?? DEFAULT_CENTER.lat),
    lng: String(initialPlace?.lng ?? DEFAULT_CENTER.lng),
    category: initialPlace?.category ?? "밥집",
    tags: initialPlace ? tagsToInput(initialPlace.tags) : "",
    comment: initialPlace?.comment ?? ""
  };
}

export function PlaceForm({
  members,
  initialPlace,
  pickedLocation,
  onSubmit,
  onCancelEdit
}: PlaceFormProps) {
  const [form, setForm] = useState<PlaceFormState>(() =>
    createInitialState(members, initialPlace)
  );
  const [error, setError] = useState("");
  const isEditing = Boolean(initialPlace);
  const isDisabled = members.length === 0;

  const selectedMember = useMemo(
    () => members.find((member) => member.id === form.memberId),
    [form.memberId, members]
  );

  useEffect(() => {
    setForm(createInitialState(members, initialPlace));
    setError("");
  }, [initialPlace, members]);

  useEffect(() => {
    if (!pickedLocation) return;

    setForm((current) => ({
      ...current,
      address: pickedLocation.address || current.address,
      category: pickedLocation.category ?? current.category,
      comment: pickedLocation.comment ?? current.comment,
      lat: String(pickedLocation.lat),
      lng: String(pickedLocation.lng),
      name: pickedLocation.name ?? current.name,
      naverMapUrl: pickedLocation.naverMapUrl || current.naverMapUrl,
      tags: pickedLocation.tags?.join(", ") ?? current.tags
    }));
    setError("");
  }, [pickedLocation]);

  function updateField<Key extends keyof PlaceFormState>(
    key: Key,
    value: PlaceFormState[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.memberId) {
      setError("추천자를 선택해주세요.");
      return;
    }
    if (!form.name.trim()) {
      setError("장소명을 입력해주세요.");
      return;
    }
    if (!isValidHttpUrl(form.naverMapUrl.trim())) {
      setError("네이버 지도 링크는 http 또는 https URL로 입력해주세요.");
      return;
    }
    if (!form.address.trim()) {
      setError("주소를 입력해주세요.");
      return;
    }

    // 빈 문자열 명시 체크 (Number("") = 0 이라 isFinite 체크를 통과해버리는 문제)
    if (!form.lat.trim() || !form.lng.trim()) {
      setError("위도와 경도를 입력해주세요.");
      return;
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("위도와 경도는 숫자로 입력해주세요.");
      return;
    }

    // (0, 0)은 아프리카 서쪽 적도 바다 — 사실상 실수 입력
    if (lat === 0 && lng === 0) {
      setError("좌표가 (0, 0)이에요. 지도에서 위치를 다시 선택해주세요.");
      return;
    }

    // 위경도 범위 검증 (지구 전체)
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("위도(-90~90), 경도(-180~180) 범위를 벗어났어요.");
      return;
    }

    onSubmit({
      memberId: form.memberId,
      name: form.name,
      naverMapUrl: form.naverMapUrl,
      address: form.address,
      lat,
      lng,
      category: form.category,
      tags: parseTags(form.tags),
      comment: form.comment
    });

    if (!isEditing) setForm(createInitialState(members, null));
    setError("");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="caption">{isEditing ? "장소 정보 수정" : "직접 입력"}</p>

      {isDisabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
          참여자를 먼저 추가하면 장소를 등록할 수 있어요.
        </div>
      ) : null}

      {pickedLocation && !isEditing ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold leading-6 text-emerald-800">
          {pickedLocation.name
            ? "검색한 정보가 채워졌어요. 메모만 더해 저장하세요."
            : "지도에서 선택한 위치가 입력됐어요. 장소명을 입력해주세요."}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">추천자</span>
          <select
            className="field"
            disabled={isDisabled}
            value={form.memberId}
            onChange={(event) => updateField("memberId", event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">카테고리</span>
          <select
            className="field"
            disabled={isDisabled}
            value={form.category}
            onChange={(event) =>
              updateField("category", event.target.value as PlaceCreateInput["category"])
            }
          >
            {PLACE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="field-label">장소명</span>
        <input
          className="field"
          disabled={isDisabled}
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="예: 전포 감성카페"
        />
      </label>

      <label className="block">
        <span className="field-label">네이버 지도 링크</span>
        <input
          className="field"
          disabled={isDisabled}
          type="url"
          value={form.naverMapUrl}
          onChange={(event) => updateField("naverMapUrl", event.target.value)}
          placeholder="https://map.naver.com/..."
        />
      </label>

      <label className="block">
        <span className="field-label">주소</span>
        <input
          className="field"
          disabled={isDisabled}
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="예: 부산 부산진구 전포동"
        />
      </label>

      <label className="block">
        <span className="field-label">태그 (쉼표 구분)</span>
        <input
          className="field"
          disabled={isDisabled}
          value={form.tags}
          onChange={(event) => updateField("tags", event.target.value)}
          placeholder="혼밥, 가성비, 웨이팅적음"
        />
      </label>

      <label className="block">
        <span className="field-label">메모</span>
        <textarea
          className="field min-h-20 resize-y"
          disabled={isDisabled}
          value={form.comment}
          onChange={(event) => updateField("comment", event.target.value)}
          placeholder="친구에게 알려주고 싶은 핵심만 짧게."
        />
      </label>

      {selectedMember ? (
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: selectedMember.markerColor }}
            aria-hidden
          />
          {selectedMember.nickname} 색상으로 지도에 표시돼요.
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        {isEditing && onCancelEdit ? (
          <button
            className="btn-ghost flex-1"
            onClick={onCancelEdit}
            type="button"
          >
            취소
          </button>
        ) : null}
        <button className="btn-primary flex-1" disabled={isDisabled} type="submit">
          <Save size={15} />
          {isEditing ? "수정 저장" : "장소 저장"}
        </button>
      </div>
    </form>
  );
}
