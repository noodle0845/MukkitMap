"use client";

import { useState } from "react";
import { ChevronDown, Tag, X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { PLACE_CATEGORIES, type FilterState, type Member } from "@/lib/types";

type FilterBarProps = {
  filters: FilterState;
  members: Member[];
  tags: string[];
  onChange: (filters: FilterState) => void;
};

const DEFAULT_FILTERS: FilterState = {
  memberId: "전체",
  category: "전체",
  tag: "전체"
};

export function FilterBar({ filters, members, tags, onChange }: FilterBarProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const isFiltered =
    filters.memberId !== "전체" ||
    filters.category !== "전체" ||
    filters.tag !== "전체";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
      {/* Members */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          active={filters.memberId === "전체"}
          onClick={() => onChange({ ...filters, memberId: "전체" })}
        >
          전체
        </Chip>
        {members.map((member) => (
          <Chip
            key={member.id}
            active={filters.memberId === member.id}
            onClick={() => onChange({ ...filters, memberId: member.id })}
            dotColor={member.markerColor}
          >
            {member.nickname}
          </Chip>
        ))}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip
          active={filters.category === "전체"}
          onClick={() => onChange({ ...filters, category: "전체" })}
        >
          모든 카테고리
        </Chip>
        {PLACE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={filters.category === category}
            onClick={() => onChange({ ...filters, category })}
          >
            {category}
          </Chip>
        ))}
      </div>

      {/* Tag dropdown (rare) */}
      {tags.length > 0 ? (
        <div className="relative">
          <button
            className={`chip ${filters.tag !== "전체" ? "chip-active" : ""}`}
            onClick={() => setTagOpen((current) => !current)}
            type="button"
            aria-haspopup="menu"
            aria-expanded={tagOpen}
          >
            <Tag size={13} />
            {filters.tag === "전체" ? "태그" : `#${filters.tag}`}
            <ChevronDown size={13} />
          </button>

          {tagOpen ? (
            <div
              className="menu w-56 max-h-72 overflow-auto"
              role="menu"
              onMouseLeave={() => setTagOpen(false)}
            >
              <button
                className="menu-item"
                onClick={() => {
                  onChange({ ...filters, tag: "전체" });
                  setTagOpen(false);
                }}
                type="button"
              >
                전체
              </button>
              {tags.map((tag) => (
                <button
                  className="menu-item"
                  key={tag}
                  onClick={() => {
                    onChange({ ...filters, tag });
                    setTagOpen(false);
                  }}
                  type="button"
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Reset (only when active) */}
      {isFiltered ? (
        <button
          className="btn-link ml-auto"
          onClick={() => onChange(DEFAULT_FILTERS)}
          type="button"
        >
          <X size={14} />
          필터 초기화
        </button>
      ) : null}
    </div>
  );
}

// Backwards compatibility export — old name still imports cleanly.
export const FilterPanel = FilterBar;
