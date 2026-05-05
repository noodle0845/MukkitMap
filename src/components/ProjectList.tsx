"use client";

import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users
} from "lucide-react";
import type { Project, ProjectCounts } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProjectListProps = {
  projects: Project[];
  counts: Record<string, ProjectCounts>;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canEditProject?: (project: Project) => boolean;
  canDeleteProject?: (project: Project) => boolean;
};

type ProjectCardProps = {
  project: Project;
  counts: ProjectCounts;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canEditProject?: (project: Project) => boolean;
  canDeleteProject?: (project: Project) => boolean;
};

function ProjectCard({
  project,
  counts,
  onEdit,
  onDelete,
  canEditProject,
  canDeleteProject
}: ProjectCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const pressTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canEdit = Boolean(onEdit && (canEditProject?.(project) ?? true));
  const canDelete = Boolean(onDelete && (canDeleteProject?.(project) ?? true));
  const hasActions = canEdit || canDelete;

  useEffect(() => {
    if (!actionsOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setActionsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActionsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen]);

  function clearLongPress() {
    if (!pressTimerRef.current) return;
    window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }

  function startLongPress(event: ReactPointerEvent<HTMLElement>) {
    if (!hasActions) return;
    if (
      (event.target as HTMLElement).closest(
        "a, button, input, textarea, select, [role='button']"
      )
    ) return;

    clearLongPress();
    pressTimerRef.current = window.setTimeout(() => {
      setActionsOpen(true);
    }, 550);
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLElement>) {
    if (!hasActions) return;
    event.preventDefault();
    setActionsOpen(true);
  }

  function handleEdit() {
    setActionsOpen(false);
    onEdit?.(project);
  }

  function handleDelete() {
    setActionsOpen(false);
    onDelete?.(project);
  }

  return (
    <article
      className="card group relative flex select-none flex-col gap-4 p-5 touch-manipulation"
      onContextMenu={handleContextMenu}
      onPointerCancel={clearLongPress}
      onPointerDown={startLongPress}
      onPointerLeave={clearLongPress}
      onPointerUp={clearLongPress}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          className="title line-clamp-1 rounded-lg outline-none transition hover:text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-200"
          href={`/projects/${project.id}`}
          aria-label={`${project.name} 열기`}
        >
          {project.name}
        </Link>
        <div className="relative flex shrink-0 items-center gap-2" ref={menuRef}>
          <Link
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-slate-500 transition hover:border-emerald-300 hover:bg-[var(--primary-soft)] hover:text-emerald-600"
            href={`/projects/${project.id}`}
            aria-label={`${project.name} 열기`}
            title="프로젝트 열기"
          >
            <ArrowUpRight size={16} />
          </Link>

          {hasActions ? (
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => setActionsOpen((open) => !open)}
              type="button"
              aria-expanded={actionsOpen}
              aria-label={`${project.name} 메뉴 열기`}
              title="수정/삭제"
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}

          {actionsOpen ? (
            <div
              className="absolute right-0 top-10 z-20 min-w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
              role="menu"
            >
              {canEdit ? (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                  onClick={handleEdit}
                  type="button"
                  role="menuitem"
                >
                  <Pencil size={14} />
                  수정
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-bold text-red-500 hover:bg-red-50"
                  onClick={handleDelete}
                  type="button"
                  role="menuitem"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="line-clamp-2 text-[13px] leading-6 text-slate-500">
        {project.description || "설명이 없는 프로젝트입니다."}
      </p>

      <div className="mt-auto flex items-center gap-3 border-t border-[var(--border-soft)] pt-4 text-[12px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Users size={13} className="text-slate-400" />
          {counts.memberCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPinned size={13} className="text-slate-400" />
          {counts.placeCount}
        </span>
        <span className="ml-auto text-slate-400">
          {formatDate(project.createdAt)}
        </span>
      </div>
    </article>
  );
}

export function ProjectList({
  projects,
  counts,
  onEdit,
  onDelete,
  canEditProject,
  canDeleteProject
}: ProjectListProps) {
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
            <ProjectCard
              counts={c}
              project={project}
              key={project.id}
              onEdit={onEdit}
              onDelete={onDelete}
              canEditProject={canEditProject}
              canDeleteProject={canDeleteProject}
            />
          );
        })}
      </div>
    </div>
  );
}
