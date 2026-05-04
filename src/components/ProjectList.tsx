"use client";

import Link from "next/link";
import { ArrowUpRight, MapPinned, Trash2, Users } from "lucide-react";
import type { Project, ProjectCounts } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProjectListProps = {
  projects: Project[];
  counts: Record<string, ProjectCounts>;
  onDelete: (project: Project) => void;
};

export function ProjectList({ projects, counts, onDelete }: ProjectListProps) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="display text-[22px]">내 프로젝트</h2>
          <p className="mt-1 text-sm text-slate-500">
            공유 데이터베이스에 저장된 지도방 {projects.length}개
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const c = counts[project.id] ?? { memberCount: 0, placeCount: 0 };

          return (
            <article
              className="card group flex flex-col gap-4 p-5"
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="title line-clamp-1">{project.name}</h3>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-slate-500 transition hover:border-emerald-300 hover:bg-[var(--primary-soft)] hover:text-emerald-600"
                    href={`/projects/${project.id}`}
                    aria-label={`${project.name} 열기`}
                    title="프로젝트 열기"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    onClick={() => onDelete(project)}
                    type="button"
                    aria-label={`${project.name} 삭제`}
                    title="프로젝트 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className="line-clamp-2 text-[13px] leading-6 text-slate-500">
                {project.description || "설명이 없는 프로젝트입니다."}
              </p>

              <div className="mt-auto flex items-center gap-3 border-t border-[var(--border-soft)] pt-4 text-[12px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users size={13} className="text-slate-400" />
                  {c.memberCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPinned size={13} className="text-slate-400" />
                  {c.placeCount}
                </span>
                <span className="ml-auto text-slate-400">
                  {formatDate(project.createdAt)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
