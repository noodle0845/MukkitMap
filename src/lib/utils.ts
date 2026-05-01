import type { Member, Place } from "@/lib/types";

export const DEFAULT_CENTER = {
  lat: 35.1796,
  lng: 129.0756
};

export function createId(prefix: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(iso));
}

export function parseTags(input: string) {
  const seen = new Set<string>();

  return input
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function tagsToInput(tags: string[]) {
  return tags.join(", ");
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getMemberForPlace(place: Place, members: Member[]) {
  return members.find((member) => member.id === place.memberId);
}

export function getMemberColor(member?: Member) {
  return member?.markerColor ?? "#64748b";
}

export function uniqueTags(places: Place[]) {
  return Array.from(new Set(places.flatMap((place) => place.tags))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
}

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function safeMarkerColor(value: string | undefined) {
  return value && isHexColor(value) ? value : "#ef4444";
}

export function createNaverCoordinateUrl(lat: number, lng: number, address?: string) {
  if (address?.trim()) {
    return `https://map.naver.com/p/search/${encodeURIComponent(address.trim())}`;
  }

  return `https://map.naver.com/p?c=${lng},${lat},15,0,0,0,dh`;
}
