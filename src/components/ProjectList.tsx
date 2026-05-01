"use client";

import Link from "next/link";
import { ArrowUpRight, MapPinned, Users } from "lucide-react";
import type { Project, ProjectCounts } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProjectListProps = {
  projects: Project[];
  counts: Record<string, ProjectCounts>;
};

export function ProjectList({ projects, counts }: ProjectListProps) {
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
            <Link
              className="card group flex flex-col gap-4 p-5"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="title line-clamp-1">{project.name}</h3>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-slate-500 transition group-hover:border-emerald-300 group-hover:bg-[var(--primary-soft)] group-hover:text-emerald-600">
                  <ArrowUpRight size={16} />
                </span>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
