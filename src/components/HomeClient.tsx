"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Link2,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Project, ProjectCounts, ProjectCreateInput } from "@/lib/types";
import {
  createProject,
  deleteProject,
  getProjectCounts,
  getProjects
} from "@/lib/supabaseStorage";

const LOAD_TIMEOUT_MS = 5000;

type LoadStatus = "loading" | "loaded" | "error";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 120)
    : "잠시 후 다시 시도해주세요.";
}

function getAuthUrl(returnTo: string) {
  return `/auth?returnTo=${encodeURIComponent(returnTo)}`;
}

function extractInviteCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/invite\/([^/?#\s]+)/);
    return match?.[1] ?? "";
  } catch {
    const match = trimmed.match(/(?:^|\/)invite\/([^/?#\s]+)/);
    return match?.[1] ?? trimmed.replace(/^#/, "");
  }
}

function ProjectSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-[126px] animate-pulse rounded-3xl bg-slate-100"
        />
      ))}
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const toast = useToast();
  const { user, authLoading, signOut } = useAuth();
  const authConfigured = isSupabaseConfigured();

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

  const loadProjects = useCallback(async () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    activeRef.current = true;
    setLoadStatus("loading");
    setLoadErrorMsg("");

    tidRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setLoadStatus("error");
      setLoadErrorMsg("불러오기가 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.");
    }, LOAD_TIMEOUT_MS);

    try {
      const nextProjects = await getProjects();
      if (!activeRef.current) return;
      const nextCounts = await getProjectCounts(nextProjects);
      if (!activeRef.current) return;
      if (tidRef.current) clearTimeout(tidRef.current);
      setProjects(nextProjects);
      setCounts(nextCounts);
      setLoadStatus("loaded");
    } catch (error) {
      if (!activeRef.current) return;
      if (tidRef.current) clearTimeout(tidRef.current);
      console.error("[먹킷맵] 프로젝트 로딩 실패:", error);
      setProjects([]);
      setCounts({});
      setLoadErrorMsg(getErrorMessage(error));
      setLoadStatus("error");
    }
  }, []);

  useEffect(() => {
    if (authConfigured && authLoading) return;

    if (authConfigured && !user) {
      activeRef.current = false;
      if (tidRef.current) clearTimeout(tidRef.current);
      setProjects([]);
      setCounts({});
      setLoadStatus("loaded");
      setLoadErrorMsg("");
      return;
    }

    loadProjects();
    return () => {
      activeRef.current = false;
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, [authConfigured, authLoading, loadProjects, user]);

  function requireLogin(returnTo: string) {
    if (authConfigured && !user) {
      router.push(getAuthUrl(returnTo));
      return true;
    }
    return false;
  }

  function handleOpenCreate() {
    if (requireLogin("/")) return;
    setCreateOpen(true);
  }

  async function handleCreateProject(input: ProjectCreateInput) {
    try {
      const project = await createProject(input);
      setCreateOpen(false);
      toast.show({ title: "먹킷맵을 만들었어요", tone: "success" });
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

  async function handleDeleteProject(project: Project) {
    if (
      !window.confirm(
        `"${project.name}" 먹킷맵을 삭제할까요?\n참여자와 장소도 함께 삭제됩니다.`
      )
    ) {
      return;
    }

    try {
      await deleteProject(project.id);
      await loadProjects();
      toast.show({
        title: "먹킷맵을 삭제했어요",
        description: `${project.name} 지도를 정리했습니다.`,
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
    const inviteCode = extractInviteCode(joinUrl);
    if (!inviteCode) {
      setJoinError("초대 링크 또는 초대 코드를 입력해주세요.");
      return;
    }

    const invitePath = `/invite/${inviteCode}`;
    setJoinOpen(false);
    setJoinUrl("");
    setJoinError("");

    if (authConfigured && !user) {
      router.push(getAuthUrl(invitePath));
      return;
    }

    router.push(invitePath);
  }

  const loggedOut = authConfigured && !authLoading && !user;
  const hasProjects = !loggedOut && loadStatus === "loaded" && projects.length > 0;
  const isEmpty = !loggedOut && loadStatus === "loaded" && projects.length === 0;
  const isError = !loggedOut && loadStatus === "error";
  const isLoading =
    (authConfigured && authLoading) || (!loggedOut && loadStatus === "loading");

  return (
    <main className="min-h-screen px-5 pb-24 sm:px-4">
      <div className="mx-auto max-w-lg">
        {/* ── 헤더 ── */}
        <header className="flex items-center justify-between pt-5 pb-5 sm:pt-8 sm:pb-6">
          <GhostlyLogo className="w-[120px] sm:w-[148px]" />
          {authConfigured ? (
            user ? (
              <button
                className="btn-ghost h-10 px-3 text-[13px]"
                onClick={signOut}
                type="button"
              >
                <LogOut size={15} />
                로그아웃
              </button>
            ) : (
              <button
                className="btn-ghost h-10 px-3 text-[13px]"
                onClick={() => router.push(getAuthUrl("/"))}
                type="button"
              >
                <LogIn size={15} />
                로그인
              </button>
            )
          ) : null}
        </header>

        {/* ── Hero ── */}
        <section className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <MapPin size={11} aria-hidden />
            친구 맛집 한 지도에
          </span>

          {/* 메인 타이틀 — 모바일 36px / 태블릿 52px / 데스크톱 64px */}
          <h1 className="mt-4 text-[36px] font-black leading-[1.18] tracking-tight text-slate-900 sm:text-[52px] sm:leading-[1.15] lg:text-[64px]">
            친구 맛집,
            <br />
            한 지도에
          </h1>

          {/* 서브 카피 */}
          <p className="mt-3 text-[15px] font-semibold leading-snug text-slate-700 sm:text-[17px]">
            카톡방에 흩어진 맛집 추천을
            <br />
            먹킷맵에 모아보세요.
          </p>

          {/* 설명 */}
          <p className="mt-4 max-w-[300px] text-[13px] leading-relaxed text-slate-400 sm:max-w-sm sm:text-[14px]">
            참여자별 색상 마커, 네이버 지도 검색, 태그 필터로
            <br className="hidden sm:block" />
            {" "}친구들의 추천 맛집을 쉽게 정리할 수 있어요.
          </p>

          {/* CTA 버튼 — 모바일 세로 / sm 이상 가로 */}
          <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:gap-3">
            <button
              className="btn-primary w-full justify-center py-[14px] text-[15px] sm:flex-1"
              onClick={handleOpenCreate}
              type="button"
            >
              <Plus size={18} />
              새 먹킷맵 만들기
            </button>
            <button
              className="btn-ghost w-full justify-center py-[14px] text-[15px] sm:flex-1"
              onClick={() => setJoinOpen(true)}
              type="button"
            >
              <Link2 size={16} />
              초대 링크로 참여하기
            </button>
          </div>
        </section>

        <section className="mt-12">
          {loggedOut ? (
            <div className="rounded-3xl border border-[var(--border)] bg-white px-6 py-8 text-center shadow-soft">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <LogIn size={22} />
              </div>
              <h2 className="title">내 먹킷맵 보기</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                로그인하면 최근 만든 먹킷맵을 볼 수 있어요.
              </p>
              <button
                className="btn-primary mt-5 w-full justify-center"
                onClick={() => router.push(getAuthUrl("/"))}
                type="button"
              >
                <LogIn size={16} />
                로그인하기
              </button>
            </div>
          ) : (
            <>
              {isLoading && <ProjectSkeleton />}

              {isError && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5">
                  <p className="flex-1 text-[13px] font-semibold text-red-700">
                    {loadErrorMsg || "프로젝트를 불러오지 못했어요."}
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

              {isEmpty && (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <Sparkles size={34} className="text-emerald-500" />
                  <p className="mt-4 text-[15px] font-bold text-slate-800">
                    아직 만든 먹킷맵이 없어요.
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    첫 먹킷맵을 만들어볼까요?
                  </p>
                  <button className="btn-primary mt-5" onClick={handleOpenCreate}>
                    <Plus size={15} />
                    새 먹킷맵 만들기
                  </button>
                </div>
              )}

              {hasProjects && (
                <ProjectList
                  projects={projects}
                  counts={counts}
                  onDelete={handleDeleteProject}
                  canDeleteProject={(project) =>
                    !authConfigured || counts[project.id]?.myRole === "owner"
                  }
                />
              )}
            </>
          )}
        </section>
      </div>

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth={560}
      >
        <div className="space-y-5">
          <div>
            <h2 className="title">새 먹킷맵</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              여행, 동네 모임, 회사 점심 리스트를 프로젝트로 정리하세요.
            </p>
          </div>
          <ProjectForm onSubmit={handleCreateProject} />
        </div>
      </BottomSheet>

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
              친구에게 받은 /invite 초대 링크를 붙여넣어 주세요.
            </p>
          </div>
          <div className="space-y-2">
            <input
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="https://mukkit-map.vercel.app/invite/초대코드"
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
