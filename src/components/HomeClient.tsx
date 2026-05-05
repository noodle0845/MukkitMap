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
  Users
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

// ── 로딩 스켈레톤 ────────────────────────────────────────────────
function ProjectSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

// ── 데스크톱용 서비스 미리보기 mockup ────────────────────────────
const MOCK_PLACES = [
  { name: "전포 감성 카페", member: "라면", color: "#10b981", tag: "카페" },
  { name: "서면 국밥집", member: "워렌", color: "#3b82f6", tag: "국밥" },
  { name: "광안리 오션 술집", member: "민지", color: "#a855f7", tag: "술집" },
];

function MockupPreview() {
  return (
    <div className="relative select-none">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 rounded-full bg-emerald-100 opacity-50 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-blue-100 opacity-40 blur-2xl" />

      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
        {/* 지도 mockup 영역 */}
        <div className="relative h-52 overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100">
          {/* SVG 도로 선 */}
          <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="80" x2="100%" y2="80" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="0" />
            <line x1="0" y1="140" x2="100%" y2="140" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#cbd5e1" strokeWidth="1" />
          </svg>
          {/* 블록 */}
          <div className="absolute left-[31%] top-[0%] h-16 w-[38%] rounded bg-slate-200/60" />
          <div className="absolute left-[31%] top-[58%] h-10 w-[18%] rounded bg-slate-200/50" />
          <div className="absolute left-[72%] top-[0%] h-20 w-[27%] rounded bg-slate-200/50" />

          {/* 마커 */}
          <div className="absolute" style={{ top: "28%", left: "22%" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full shadow-lg text-white text-[11px] font-black ring-2 ring-white" style={{ backgroundColor: MOCK_PLACES[0].color }}>
              라
            </div>
          </div>
          <div className="absolute" style={{ top: "52%", left: "55%" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full shadow-lg text-white text-[11px] font-black ring-2 ring-white" style={{ backgroundColor: MOCK_PLACES[1].color }}>
              워
            </div>
          </div>
          <div className="absolute" style={{ top: "18%", left: "76%" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full shadow-lg text-white text-[11px] font-black ring-2 ring-white" style={{ backgroundColor: MOCK_PLACES[2].color }}>
              민
            </div>
          </div>

          {/* 지도 레이블 */}
          <div className="absolute bottom-2 right-3 rounded-md bg-white/70 px-2 py-1 text-[10px] font-semibold text-slate-400 backdrop-blur-sm">
            먹킷맵 · 부산 친구 모임
          </div>
        </div>

        {/* 카드 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">오늘의 친구 추천</p>
            <h3 className="text-[15px] font-bold text-slate-900">부산 친구 먹킷맵</h3>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-500">
            <Users size={12} />
            3명
          </div>
        </div>

        {/* 장소 리스트 */}
        <div className="space-y-1.5 px-4 py-3">
          {MOCK_PLACES.map((p) => (
            <div key={p.name} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-white"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-800">{p.name}</p>
                <p className="text-[11px] text-slate-400">{p.member} 추천</p>
              </div>
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: `${p.color}18`, color: p.color }}
              >
                #{p.tag}
              </span>
            </div>
          ))}
        </div>

        {/* 태그 필터 */}
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {["#카페", "#술집", "#데이트", "#국밥"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컨텐츠 ──────────────────────────────────────────────────
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
    ) return;

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
    <main className="min-h-screen overflow-x-hidden bg-[#f8fafc]">
      {/* ══════════════════════════════════════════
          헤더
      ══════════════════════════════════════════ */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 lg:px-10 lg:py-5">
          <GhostlyLogo className="w-[108px] lg:w-[136px]" />
          {authConfigured ? (
            user ? (
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 lg:h-10 lg:px-4 lg:text-[14px]"
                onClick={signOut}
                type="button"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            ) : (
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 lg:h-10 lg:px-4 lg:text-[14px]"
                onClick={() => router.push(getAuthUrl("/"))}
                type="button"
              >
                <LogIn size={14} />
                로그인
              </button>
            )
          ) : null}
        </div>
      </header>

      {/* ══════════════════════════════════════════
          Hero
      ══════════════════════════════════════════ */}
      <section className="px-6 pt-10 pb-12 lg:px-10 lg:pt-20 lg:pb-24">
        <div className="mx-auto max-w-[1200px]">
          {/* 2단 그리드: 데스크톱만 */}
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-20">

            {/* ── 왼쪽: 카피 + CTA ── */}
            <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center lg:mx-0 lg:max-w-none lg:items-start lg:text-left">
              {/* 뱃지 */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                <MapPin size={11} aria-hidden />
                친구 맛집 한 지도에
              </span>

              {/* 메인 타이틀 */}
              <h1
                className="mt-5 font-black tracking-[-0.02em] text-slate-900 lg:mt-6 lg:text-[60px] lg:leading-[1.07]"
                style={{ fontSize: "clamp(42px, 11vw, 52px)", lineHeight: 1.1 }}
              >
                친구가 추천한 맛집만
                <br />
                한 지도에 모으세요.
              </h1>

              {/* 서브 카피 */}
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-slate-600 lg:mt-5 lg:text-[18px]">
                카톡방에 흩어진 맛집 링크를 프로젝트별로 정리하고,
                <br className="hidden lg:block" />
                초대받은 친구들만 함께 볼 수 있는 비공개 맛집 지도를 만드세요.
              </p>

              {/* 설명 */}
              <p className="mt-3 text-[14px] leading-relaxed text-slate-400 lg:text-[15px]">
                색상 마커와 태그로
                {" "}친구 맛집을 쉽게 모아봐요.
              </p>

              {/* CTA 버튼 */}
              <div className="mt-8 flex w-full max-w-[420px] flex-col gap-3 lg:max-w-none lg:flex-row lg:gap-3.5">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 text-[15px] font-bold text-white shadow-md shadow-emerald-200/70 transition hover:bg-emerald-600 active:scale-[0.98] lg:w-auto lg:text-[15px]"
                  style={{ height: "56px" }}
                  onClick={handleOpenCreate}
                  type="button"
                >
                  <Plus size={18} />
                  친구들과 지도 만들기
                </button>
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-[15px] font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] lg:w-auto"
                  style={{ height: "56px" }}
                  onClick={() => setJoinOpen(true)}
                  type="button"
                >
                  <Link2 size={15} />
                  초대 링크로 입장하기
                </button>
              </div>
            </div>

            {/* ── 오른쪽: 서비스 미리보기 (데스크톱만) ── */}
            <div className="mt-14 hidden lg:mt-0 lg:block">
              <MockupPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          내 먹킷맵 섹션
      ══════════════════════════════════════════ */}
      <section className="px-6 pb-20 lg:px-10">
        <div className="mx-auto max-w-[1200px]">

          {/* 로그아웃 상태 */}
          {loggedOut && (
            <div className="mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm lg:max-w-none lg:gap-4 lg:px-6 lg:py-5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 lg:h-10 lg:w-10">
                <LogIn size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-800 lg:text-[14px]">내 먹킷맵 보기</p>
                <p className="mt-0.5 text-[12px] text-slate-500 lg:text-[13px]">
                  로그인하면 최근 만든 먹킷맵을 볼 수 있어요.
                </p>
              </div>
              <button
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-emerald-600"
                onClick={() => router.push(getAuthUrl("/"))}
                type="button"
              >
                <LogIn size={14} />
                로그인
              </button>
            </div>
          )}

          {/* 로그인 상태 */}
          {!loggedOut && (
            <>
              {isLoading && <ProjectSkeleton />}

              {isError && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5">
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
                <div className="mx-auto flex max-w-[420px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm lg:max-w-none lg:gap-4 lg:px-5 lg:py-5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 lg:h-10 lg:w-10">
                    <MapPin size={17} className="text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 lg:text-[14px]">
                      아직 먹킷맵이 없어요
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500 lg:text-[13px]">
                      첫 먹킷맵을 만들어볼까요?
                    </p>
                  </div>
                  <button
                    className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 lg:px-3.5 lg:text-[13px]"
                    onClick={handleOpenCreate}
                    type="button"
                  >
                    <Plus size={13} />
                    만들기
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
        </div>
      </section>

      {/* ══════════════════════════════════════════
          Sheets
      ══════════════════════════════════════════ */}
      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} maxWidth={560}>
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
        onClose={() => { setJoinOpen(false); setJoinUrl(""); setJoinError(""); }}
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
              onChange={(e) => { setJoinUrl(e.target.value); setJoinError(""); }}
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
