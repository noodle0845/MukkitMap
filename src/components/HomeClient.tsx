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

// 프로젝트 로딩은 최대 5초
const LOAD_TIMEOUT_MS = 5000;

// 랜딩 화면 미리보기 카드
const PREVIEW_CARDS = [
  { name: "라면", color: "#ef4444", place: "전포 감성카페" },
  { name: "워렌", color: "#3b82f6", place: "서면 국밥집" },
  { name: "존슨", color: "#22c55e", place: "광안리 술집" },
  { name: "베일", color: "#f59e0b", place: "해운대 디저트" }
] as const;

type LoadStatus = "loading" | "loaded" | "error";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 120) : "잠시 후 다시 시도해주세요.";
}

function HomeContent() {
  const router = useRouter();
  const toast = useToast();

  // 프로젝트 목록 상태
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, ProjectCounts>>({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadErrorMsg, setLoadErrorMsg] = useState("");

  // UI 시트 상태
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joinError, setJoinError] = useState("");

  // 타임아웃 정리용
  const activeRef = useRef(true);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 프로젝트 로딩 (배경에서 진행, 랜딩 화면 블록하지 않음) ──────
  const loadProjects = useCallback(async () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    activeRef.current = true;
    setLoadStatus("loading");
    setLoadErrorMsg("");

    // 5초 타임아웃
    tidRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setLoadStatus("error");
      setLoadErrorMsg("네트워크가 느리거나 연결이 없어요. 잠시 후 다시 시도해주세요.");
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

  // ── 프로젝트 생성 ────────────────────────────────────────────
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

  // ── 샘플 지도 ────────────────────────────────────────────────
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

  // ── 프로젝트 삭제 ────────────────────────────────────────────
  async function handleDeleteProject(project: Project) {
    const confirmed = window.confirm(
      `"${project.name}" 프로젝트를 삭제할까요?\n참여자와 장소도 함께 삭제됩니다.`
    );
    if (!confirmed) return;

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

  // ── 초대 링크 참여 ────────────────────────────────────────────
  function handleJoin() {
    const trimmed = joinUrl.trim();
    if (!trimmed) {
      setJoinError("링크나 프로젝트 ID를 입력해주세요.");
      return;
    }
    // URL에서 projectId 추출: /projects/[id] 패턴
    const match = trimmed.match(/\/projects\/([^/?#\s]+)/);
    const projectId = match ? match[1] : trimmed;
    setJoinOpen(false);
    setJoinUrl("");
    setJoinError("");
    router.push(`/projects/${projectId}`);
  }

  // ── 뷰 분기 ──────────────────────────────────────────────────
  const hasProjects = loadStatus === "loaded" && projects.length > 0;
  const isLoading = loadStatus === "loading";
  const isError = loadStatus === "error";

  return (
    <main className="min-h-screen px-4 pb-20">
      <div className="mx-auto max-w-lg sm:max-w-2xl lg:max-w-4xl">

        {/* ── 헤더 ───────────────────────────────────────────── */}
        <header className="flex items-center justify-between pt-8 pb-2">
          <GhostlyLogo className="w-[140px] sm:w-[164px]" />
          {hasProjects && (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />새 지도
            </button>
          )}
        </header>

        {/* ── 로딩 배너 (비블로킹 · 하단에 아주 작게) ─────────── */}
        {isLoading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-[13px] font-semibold text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            지도 목록 불러오는 중…
          </div>
        )}

        {/* ── 에러 배너 ────────────────────────────────────────── */}
        {isError && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="flex-1 text-[13px] font-semibold text-red-700">{loadErrorMsg}</p>
            <button
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800"
              onClick={loadProjects}
              type="button"
            >
              <RefreshCw size={12} />
              다시 시도
            </button>
          </div>
        )}

        {/* ── 기존 프로젝트 목록 ──────────────────────────────── */}
        {hasProjects ? (
          <section className="mt-6">
            <ProjectList
              projects={projects}
              counts={counts}
              onDelete={handleDeleteProject}
            />
          </section>
        ) : (
          /* ── 랜딩 화면 (로딩 중이든, 비어있든 즉시 표시) ───── */
          <section className="mt-10 flex flex-col items-center text-center">

            {/* 배지 */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <MapPin size={11} aria-hidden />
              친구 추천 맛집만 모아보는 공유 지도
            </span>

            {/* 헤드라인 */}
            <h1 className="mt-4 text-[28px] font-black leading-snug text-slate-900 sm:text-4xl">
              카톡방에 흩어진 맛집,<br />
              카페, 술집을<br className="sm:hidden" />{" "}
              <span className="text-emerald-600">하나의 지도</span>로 정리해요.
            </h1>

            {/* 서브카피 */}
            <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-slate-500 sm:max-w-sm">
              친구들 추천을 한 지도에 꽂고,<br />
              색깔 마커로 누가 추천했는지 바로 확인해요.
            </p>

            {/* ── 1차 CTA: 새 먹킷맵 만들기 ────────────── */}
            <button
              className="btn-primary mt-8 w-full max-w-[280px] justify-center py-3.5 text-[15px] sm:max-w-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={18} />
              새 먹킷맵 만들기
            </button>

            {/* ── 2차 CTA: 초대 링크 / 샘플 ───────────── */}
            <div className="mt-3 flex w-full max-w-[280px] gap-2 sm:max-w-xs">
              <button
                className="btn-ghost flex-1 justify-center"
                onClick={() => setJoinOpen(true)}
              >
                <Link2 size={14} />
                초대 링크 참여
              </button>
              <button
                className="btn-ghost flex-1 justify-center"
                onClick={handleSeedSample}
              >
                <Sparkles size={14} />
                샘플 보기
              </button>
            </div>

            {/* ── 장소 카드 미리보기 ────────────────────── */}
            <div className="mt-12 grid w-full max-w-[280px] grid-cols-2 gap-3 sm:max-w-sm">
              {PREVIEW_CARDS.map(({ name, color, place }) => (
                <div className="card p-4 text-left" key={name}>
                  <span
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <p className="mt-3 text-[13px] font-bold leading-tight text-slate-900">{place}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{name} 추천</p>
                </div>
              ))}
            </div>
          </section>
        )}
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
          <button className="btn-primary w-full justify-center" onClick={handleJoin}>
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
