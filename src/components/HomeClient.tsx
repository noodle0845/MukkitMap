"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, MapPin, Plus, RefreshCw, Sparkles } from "lucide-react";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import type { Project, ProjectCounts, ProjectCreateInput } from "@/lib/types";
import {
  createProject,
  deleteProject,
  getProjectCounts,
  getProjects,
  seedSampleData
} from "@/lib/supabaseStorage";

const LOAD_TIMEOUT_MS = 5000;


type LoadStatus = "loading" | "loaded" | "error";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 120) : "잠시 후 다시 시도해주세요.";
}

// ── 최근 먹킷맵 섹션 내 skeleton ──────────────────────────────────
function ProjectSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-[72px] animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
      <p className="pt-1 text-center text-xs font-semibold text-slate-400">
        최근 만든 먹킷맵을 확인하고 있어요.
      </p>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, ProjectCounts>>({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadErrorMsg, setLoadErrorMsg] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joinError, setJoinError] = useState("");

  const activeRef = useRef(true);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 배경에서 프로젝트 조용히 로딩 ──────────────────────────────
  const loadProjects = useCallback(async () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    activeRef.current = true;
    setLoadStatus("loading");
    setLoadErrorMsg("");

    tidRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setLoadStatus("error");
      setLoadErrorMsg("네트워크가 느리거나 연결이 없어요.");
    }, LOAD_TIMEOUT_MS);

    try {
      const nextProjects = await getProjects();
      if (!activeRef.current) return;
      const nextCounts = await getProjectCounts(nextProjects);
      if (!activeRef.current) return;
      clearTimeout(tidRef.current!);
      setProjects(nextProjects);
      setCounts(nextCounts);
      setLoadStatus("loaded");
    } catch (error) {
      if (!activeRef.current) return;
      clearTimeout(tidRef.current!);
      console.error("[먹킷맵] 프로젝트 로딩 실패:", error);
      setLoadErrorMsg(getErrorMessage(error));
      setLoadStatus("error");
    }
  }, []);

  useEffect(() => {
    loadProjects();
    return () => {
      activeRef.current = false;
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, [loadProjects]);

  // ── 핸들러 ────────────────────────────────────────────────────
  async function handleCreateProject(input: ProjectCreateInput) {
    try {
      const project = await createProject(input);
      setCreateOpen(false);
      toast.show({ title: "먹킷맵을 만들었어요 🎉", tone: "success" });
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error(error);
      toast.show({
        title: "프로젝트 생성에 실패했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  async function handleSeedSample() {
    try {
      const project = await seedSampleData();
      toast.show({ title: "샘플 지도를 불러왔어요", tone: "success" });
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error(error);
      toast.show({
        title: "샘플 데이터를 만들지 못했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  async function handleDeleteProject(project: Project) {
    if (
      !window.confirm(
        `"${project.name}" 프로젝트를 삭제할까요?\n참여자와 장소도 함께 삭제됩니다.`
      )
    )
      return;

    try {
      await deleteProject(project.id);
      await loadProjects();
      toast.show({
        title: "프로젝트를 삭제했어요",
        description: `${project.name} 지도방이 정리됐습니다.`,
        tone: "info"
      });
    } catch (error) {
      console.error(error);
      toast.show({
        title: "프로젝트 삭제에 실패했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  function handleJoin() {
    const trimmed = joinUrl.trim();
    if (!trimmed) {
      setJoinError("링크나 프로젝트 ID를 입력해주세요.");
      return;
    }
    const match = trimmed.match(/\/projects\/([^/?#\s]+)/);
    const projectId = match ? match[1] : trimmed;
    setJoinOpen(false);
    setJoinUrl("");
    setJoinError("");
    router.push(`/projects/${projectId}`);
  }

  const hasProjects = loadStatus === "loaded" && projects.length > 0;
  const isEmpty = loadStatus === "loaded" && projects.length === 0;
  const isError = loadStatus === "error";

  return (
    <main className="min-h-screen px-4 pb-24">
      <div className="mx-auto max-w-lg">

        {/* ── 헤더 ───────────────────────────────────────────── */}
        <header className="flex items-center justify-center pt-8 pb-6">
          <GhostlyLogo className="w-[140px] sm:w-[160px]" />
        </header>

        {/* ══════════════════════════════════════════════════════
            히어로: 항상 노출, 로딩 상태와 무관
        ══════════════════════════════════════════════════════ */}
        <section className="flex flex-col items-center text-center">

          {/* 배지 */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <MapPin size={11} aria-hidden />
            친구 추천 맛집만 모아보는 공유 지도
          </span>

          {/* 헤드라인 */}
          <h1 className="mt-4 text-[26px] font-black leading-snug text-slate-900 sm:text-4xl">
            카톡방에 흩어진 맛집,<br />
            카페, 술집을 하나의 지도로<br />
            정리해보세요.
          </h1>

          {/* 서브카피 */}
          <p className="mt-3 max-w-[290px] text-[14px] leading-relaxed text-slate-500 sm:max-w-sm sm:text-[15px]">
            친구들 추천을 한 지도에 꽂고,<br />
            색깔 마커로 누가 추천했는지 바로 확인해요.
          </p>

          {/* ── 1차 CTA ───────────────────────────────── */}
          <button
            className="btn-primary mt-8 w-full max-w-[280px] justify-center py-3.5 text-[15px]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} />
            새 먹킷맵 만들기
          </button>

          {/* ── 2차 CTA (독립 버튼, 충분한 간격) ────── */}
          <div className="mt-3 flex w-full max-w-[280px] flex-col gap-2">
            <button
              className="btn-ghost w-full justify-center"
              onClick={() => setJoinOpen(true)}
            >
              <Link2 size={15} />
              초대 링크로 참여하기
            </button>
            <button
              className="btn-ghost w-full justify-center"
              onClick={handleSeedSample}
            >
              <Sparkles size={15} />
              샘플 지도 보기
            </button>
          </div>

        </section>

        {/* ══════════════════════════════════════════════════════
            최근 먹킷맵 섹션: 로딩/에러/비어있음/목록 상태만 여기서 처리
        ══════════════════════════════════════════════════════ */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-400">
              최근 먹킷맵
            </h2>
            {hasProjects && (
              <button
                className="btn-primary py-1.5 text-[13px]"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={14} />
                새 지도
              </button>
            )}
          </div>

          {/* 로딩 중 → skeleton */}
          {loadStatus === "loading" && <ProjectSkeleton />}

          {/* 에러 */}
          {isError && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5">
              <p className="flex-1 text-[13px] font-semibold text-red-700">
                {loadErrorMsg}
              </p>
              <button
                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700"
                onClick={loadProjects}
                type="button"
              >
                <RefreshCw size={12} />
                다시 시도
              </button>
            </div>
          )}

          {/* 비어있음 */}
          {isEmpty && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <span className="text-3xl">🗺️</span>
              <p className="mt-3 text-[14px] font-bold text-slate-700">
                아직 만든 먹킷맵이 없어요.
              </p>
              <p className="mt-1 text-[13px] text-slate-500">
                첫 먹킷맵을 만들어볼까요?
              </p>
              <button
                className="btn-primary mt-5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={15} />
                새 먹킷맵 만들기
              </button>
            </div>
          )}

          {/* 목록 */}
          {hasProjects && (
            <ProjectList
              projects={projects}
              counts={counts}
              onDelete={handleDeleteProject}
            />
          )}
        </section>
      </div>

      {/* ── 새 프로젝트 시트 ──────────────────────────────────── */}
      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth={560}
      >
        <div className="space-y-5">
          <div>
            <h2 className="title">새 먹킷맵 만들기</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              여행, 동네 모임, 카톡방 맛집 리스트를 지도로 정리하세요.
            </p>
          </div>
          <ProjectForm onSubmit={handleCreateProject} />
        </div>
      </BottomSheet>

      {/* ── 초대 링크 참여 시트 ───────────────────────────────── */}
      <BottomSheet
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setJoinUrl("");
          setJoinError("");
        }}
        maxWidth={480}
      >
        <div className="space-y-5">
          <div>
            <h2 className="title">초대 링크로 참여하기</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              친구에게 받은 먹킷맵 링크를 붙여넣어 주세요.
            </p>
          </div>
          <div className="space-y-2">
            <input
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="https://mukkit-map.vercel.app/projects/…"
              value={joinUrl}
              onChange={(e) => {
                setJoinUrl(e.target.value);
                setJoinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            {joinError && (
              <p className="text-xs font-semibold text-red-500">{joinError}</p>
            )}
          </div>
          <button
            className="btn-primary w-full justify-center"
            onClick={handleJoin}
          >
            <ArrowRight size={16} />
            참여하기
          </button>
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
