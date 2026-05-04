"use client";

import { Trash2 } from "lucide-react";
import type { Member } from "@/lib/types";

type MemberListProps = {
  members: Member[];
  onDelete?: (member: Member) => void;
};

const ROLE_LABELS: Record<Member["role"], string> = {
  owner: "방장",
  editor: "편집자",
  viewer: "보기 전용"
};

export function MemberList({ members, onDelete }: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50/40 px-4 py-6 text-center text-sm text-slate-500">
        아직 참여자가 없어요. 아래에서 추가해주세요.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      {members.map((member) => (
        <li
          className="group flex items-center justify-between gap-3 px-4 py-3"
          key={member.id}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white"
              style={{
                backgroundColor: member.markerColor,
                boxShadow: "0 0 0 1px rgba(15,23,42,0.06)"
              }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-slate-900">
                {member.nickname}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {ROLE_LABELS[member.role]}
              </p>
            </div>
          </div>

          {onDelete ? (
            <button
              className="icon-button h-8 w-8 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:border-red-200 hover:bg-[var(--danger-soft)] hover:text-red-500"
              onClick={() => onDelete(member)}
              title={`${member.nickname} 삭제`}
              type="button"
              aria-label={`${member.nickname} 삭제`}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
