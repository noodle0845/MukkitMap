"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import type { Project, ProjectCounts, ProjectCreateInput } from "@/lib/types";
import {
  createProject,
  getProjectCounts,
  getProjects,
  seedSampleData
} from "@/lib/supabaseStorage";

function HomeContent() {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, ProjectCounts>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    try {
      const nextProjects = await getProjects();
      const nextCounts = await getProjectCounts(nextProjects);

      setProjects(nextProjects);
      setCounts(nextCounts);
    } catch {
      toast.show({
        title: "프로젝트를 불러오지 못했어요",
        description: "잠시 후 다시 시도해주세요.",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  async function handleCreateProject(input: ProjectCreateInput) {
    try {
      const project = await createProject(input);
      setCreateOpen(false);
      await refreshProjects();
      toast.show({ title: "프로젝트가 생성됐어요", tone: "success" });
      router.push(`/projects/${project.id}`);
    } catch {
      toast.show({
        title: "프로젝트 생성에 실패했어요",
        description: "Supabase 연결과 환경변수를 확인해주세요.",
        tone: "error"
      });
    }
  }

  async function handleSeedSample() {
    try {
      const project = await seedSampleData();
      await refreshProjects();
      toast.show({ title: "예시 프로젝트를 불러왔어요", tone: "success" });
      router.push(`/projects/${project.id}`);
    } catch {
      toast.show({
        title: "예시 데이터를 만들지 못했어요",
        description: "Supabase 테이블 생성 여부를 확인해주세요.",
        tone: "error"
      });
    }
  }

  const isEmpty = projects.length === 0;

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* ── Topbar ───────────────────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="먹킷맵 홈으로"
              className="inline-flex transition active:scale-[0.98]"
            >
              <GhostlyLogo className="w-[150px] sm:w-[176px]" />
            </Link>
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:inline-flex">
              공유 맛집 지도
            </span>
          </div>
          {!isEmpty ? (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={17} />새 프로젝트
            </button>
          ) : null}
        </header>

        {/* ── Empty hero ──────────────────────────────────────── */}
        {loading ? (
          <section className="mt-16 flex justify-center">
            <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-soft">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              프로젝트 불러오는 중
            </div>
          </section>
        ) : isEmpty ? (
          <section className="mt-16 flex flex-col items-center text-center">
            <span className="caption text-emerald-700">친구 맛집 한 지도에</span>
            <h1 className="display mt-3 max-w-2xl">
              카톡방에 흩어진 친구 맛집을
              <br />한 지도에 모으세요.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-500">
              참여자별 색상으로 구분되는 마커, 네이버 지도 검색 연동, 태그 필터까지.
              <br />첫 번째 프로젝트를 만들어 친구들과 공유해보세요.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={17} />새 프로젝트 만들기
              </button>
              <button className="btn-ghost" onClick={handleSeedSample}>
                <Sparkles size={17} />
                예시 보기
              </button>
            </div>

            <div className="mt-14 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["라면", "#ef4444", "전포 감성카페"],
                ["워렌", "#3b82f6", "서면 국밥집"],
                ["존슨", "#10b981", "광안리 술집"],
                ["베일", "#f59e0b", "해운대 디저트샵"]
              ].map(([name, color, place]) => (
                <div
                  className="card p-4 text-left"
                  key={name as string}
                >
                  <span
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color as string }}
                    aria-hidden
                  />
                  <p className="mt-3 text-[14px] font-bold text-slate-900">{place}</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">
                    {name} 추천
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          // ── Filled state ───────────────────────────────────────
          <section className="mt-10">
            <ProjectList projects={projects} counts={counts} />
          </section>
        )}
      </div>

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth={560}
      >
        <div className="space-y-5">
          <div>
            <h2 className="title">새 프로젝트</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              여행, 동네 모임, 회사 점심 리스트를 프로젝트로 정리하세요.
            </p>
          </div>
          <ProjectForm onSubmit={handleCreateProject} />
        </div>
      </BottomSheet>
    </main>
  );
}

export function HomeClient() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}
