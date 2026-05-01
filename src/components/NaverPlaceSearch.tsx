"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import type { NaverLocalSearchItem, PickedLocation, PlaceCategory } from "@/lib/types";

type SearchResult = NaverLocalSearchItem & {
  inferredCategory: PlaceCategory;
};

type NaverPlaceSearchProps = {
  onPickPlace: (location: PickedLocation) => void;
};

function tagsFromCategory(category: string) {
  return category
    .split(">")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(-3);
}

export function NaverPlaceSearch({ onPickPlace }: NaverPlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setMessage("검색어를 두 글자 이상 입력해주세요.");
      setResults([]);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/naver/local-search?query=${encodeURIComponent(query.trim())}`
      );
      const data = (await response.json()) as {
        message?: string;
        items?: SearchResult[];
      };

      if (!response.ok) {
        setMessage(data.message ?? "검색에 실패했습니다.");
        setResults([]);
        return;
      }

      setResults(data.items ?? []);
      setMessage(data.items?.length ? "" : "검색 결과가 없습니다.");
    } catch {
      setMessage("검색 중 오류가 발생했습니다.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePick(result: SearchResult) {
    onPickPlace({
      address: result.roadAddress || result.address,
      category: result.inferredCategory,
      comment: result.description,
      lat: result.lat,
      lng: result.lng,
      name: result.title,
      naverMapUrl: result.naverMapUrl,
      tags: tagsFromCategory(result.category)
    });
  }

  return (
    <section>
      <p className="caption">네이버 검색</p>
      <form className="mt-2 flex gap-2" onSubmit={handleSearch}>
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="field mt-0 pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="가게 이름이나 키워드"
          />
        </div>
        <button className="btn-primary shrink-0" disabled={isLoading} type="submit">
          {isLoading ? "검색 중" : "검색"}
        </button>
      </form>

      {message ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-800">
          {message}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="scroll-pretty mt-3 max-h-72 space-y-2 overflow-auto pr-1">
          {results.map((result) => (
            <li
              key={`${result.title}-${result.address}`}
              className="card cursor-pointer p-3 transition hover:border-emerald-300"
              onClick={() => handlePick(result)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") handlePick(result);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-slate-900">
                    {result.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    {result.category || "분류 없음"}
                  </p>
                </div>
                <ArrowRight
                  size={15}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:text-emerald-600"
                />
              </div>
              <p className="mt-2 flex items-start gap-1.5 truncate text-[12px] leading-5 text-slate-500">
                <MapPin size={12} className="mt-0.5 shrink-0" />
                {result.roadAddress || result.address || "주소 없음"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
