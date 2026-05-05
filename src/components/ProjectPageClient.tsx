"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Home,
  Link2,
  LogIn,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Users
} from "lucide-react";
import { FilterBar } from "@/components/FilterPanel";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { MemberForm } from "@/components/MemberForm";
import { MemberList } from "@/components/MemberList";
import { NaverPlaceSearch } from "@/components/NaverPlaceSearch";
import { PlaceDetailCard } from "@/components/PlaceDetailCard";
import { PlaceForm } from "@/components/PlaceForm";
import { PlaceList } from "@/components/PlaceList";
import { Sheet } from "@/components/ui/Sheet";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import type {
  FilterState,
  Member,
  PickedLocation,
  Place,
  PlaceCreateInput,
  Project
} from "@/lib/types";
import {
  createMember,
  createPlace,
  deleteMember,
  deletePlace,
  getProjectBundle,
  regenerateInviteCode,
  updatePlace
} from "@/lib/supabaseStorage";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { getMemberForPlace, uniqueTags } from "@/lib/utils";

const LOAD_TIMEOUT_MS = 5000;

const LeafletMapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const NaverMapView = dynamic(
  () => import("@/components/NaverMapView").then((m) => m.NaverMapView),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="panel flex h-[480px] items-center justify-center bg-slate-50/40 lg:h-[640px]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        지도 불러오는 중
      </div>
    </div>
  );
}

const SelectedMapView = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
  ? NaverMapView
  : LeafletMapView;

const DEFAULT_FILTERS: FilterState = {
  memberId: "전체",
  category: "전체",
  tag: "전체"
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 120) : "잠시 후 다시 시도해주세요.";
}

type LoadStatus = "loading" | "loaded" | "timeout" | "network-error" | "access-denied";

type ProjectPageClientProps = { projectId: string };

type SheetMode =
  | { kind: "closed" }
  | { kind: "onboarding" }
  | { kind: "members" }
  | { kind: "place-create" }
  | { kind: "place-edit"; placeId: string }
  | { kind: "place-detail"; placeId: string };

// ── 공통 화면 컴포넌트 ────────────────────────────────────────────

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <span className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          지도 불러오는 중…
        </span>
        <p className="text-xs font-semibold text-slate-400">잠깐만요, 최대 5초 기다릴게요</p>
      </div>
    </main>
  );
}

function LoadErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <MapPin size={22} className="text-red-400" />
        </div>
        <h1 className="title">지도를 불러오지 못했어요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          링크가 잘못되었거나 네트워크 문제가 있을 수 있어요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button className="btn-primary w-full justify-center" onClick={onRetry}>
            <RefreshCw size={15} />
            다시 시도
          </button>
          <Link className="btn-ghost w-full justify-center" href="/">
            <Home size={15} />
            처음으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function NotFoundScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl">🗺️</span>
        </div>
        <h1 className="title">존재하지 않는 먹킷맵이에요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          링크가 만료되었거나 삭제된 지도일 수 있어요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link className="btn-primary w-full justify-center" href="/">
            <Plus size={15} />
            새 지도 만들기
          </Link>
          <Link className="btn-ghost w-full justify-center" href="/">
            <ArrowLeft size={15} />
            처음으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function AccessDeniedScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="title">이 먹킷맵에 접근할 수 없어요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          초대 링크로만 참여할 수 있어요.<br />
          친구에게 초대 링크를 받아보세요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            className="btn-primary w-full justify-center"
            href="/"
          >
            <Home size={15} />
            처음으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function extractInviteCodeFromInput(value: string): string {
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

function AccessDeniedScreenV2({
  onChangeAccount,
  user,
  projectId,
}: {
  onChangeAccount: () => void;
  user: { id: string } | null;
  projectId: string;
}) {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [joinError, setJoinError] = useState("");

  function handleJoinWithInvite() {
    const code = extractInviteCodeFromInput(inviteInput);
    if (!code) {
      setJoinError("초대 링크 또는 초대 코드를 입력해주세요.");
      return;
    }
    // 초대 페이지에서 닉네임 입력 + 참여 처리
    router.push(`/invite/${code}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="title">이 먹킷맵에 접근할 수 없어요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          초대 링크로 참여해야 지도를 볼 수 있어요.
          <br />
          친구에게 초대 링크를 받아 붙여넣어 주세요.
        </p>

        {/* 초대 링크 입력 */}
        <div className="mt-5 space-y-2 text-left">
          <input
            className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="초대 링크 붙여넣기"
            value={inviteInput}
            onChange={(e) => { setInviteInput(e.target.value); setJoinError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleJoinWithInvite()}
          />
          {joinError && (
            <p className="text-xs font-semibold text-red-500">{joinError}</p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            className="btn-primary w-full justify-center"
            onClick={handleJoinWithInvite}
            type="button"
          >
            <LogIn size={15} />
            초대 링크로 참여하기
          </button>
          {user && (
            <button
              className="btn-ghost w-full justify-center text-slate-400"
              onClick={onChangeAccount}
              type="button"
            >
              다른 계정으로 로그인
            </button>
          )}
          <Link className="btn-ghost w-full justify-center" href="/">
            <Home size={15} />
            처음으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function NeedLoginScreen({ projectId }: { projectId: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="card w-full max-w-sm p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <LogIn size={22} className="text-emerald-600" />
        </div>
        <h1 className="title">로그인이 필요해요</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          먹킷맵은 초대받은 멤버만 볼 수 있어요.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            className="btn-primary w-full justify-center"
            href={`/auth?returnTo=/projects/${projectId}`}
          >
            <LogIn size={15} />
            로그인 / 회원가입
          </Link>
          <Link className="btn-ghost w-full justify-center" href="/">
            <Home size={15} />
            처음으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

function EmptyPlacesState({ onAddPlace }: { onAddPlace: () => void }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <span className="text-4xl">📍</span>
      <h3 className="mt-4 text-[16px] font-bold text-slate-900">
        아직 등록된 맛집이 없어요
      </h3>
      <p className="mt-2 text-sm text-slate-500">첫 맛집을 꽂아볼까요?</p>
      <button className="btn-primary mt-5" onClick={onAddPlace} type="button">
        <Plus size={16} />
        장소 추가하기
      </button>
    </div>
  );
}

function OnboardingContent({
  onSubmit
}: {
  onSubmit: (input: Parameters<typeof createMember>[1]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="title">먹킷맵에 오신 걸 환영해요 👋</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          지도에서 사용할 닉네임과 마커 색상을 정해주세요.
        </p>
      </div>
      <MemberForm defaultRole="owner" onSubmit={onSubmit} />
    </div>
  );
}

// ── 메인 컨텐츠 ───────────────────────────────────────────────────

function ProjectContent({ projectId }: ProjectPageClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { user, authLoading, signOut } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [sheet, setSheet] = useState<SheetMode>({ kind: "closed" });
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const onboardingShownRef = useRef(false);
  const activeRef = useRef(true);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 현재 로그인 유저의 멤버 레코드 (권한 확인용)
  const myMember = useMemo(
    () => members.find((m) => m.userId === user?.id) ?? null,
    [members, user]
  );

  // 권한 헬퍼
  const isOwner = myMember?.role === "owner";
  const canEdit =
    !isSupabaseConfigured() || // 로컬 모드는 제한 없음
    myMember?.role === "owner" ||
    myMember?.role === "editor";
  const canManageMembers = !isSupabaseConfigured() || isOwner;

  // ── 프로젝트 로딩 ──────────────────────────────────────────
  const refreshProject = useCallback(async () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    activeRef.current = true;
    setLoadStatus("loading");

    tidRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setLoadStatus("timeout");
    }, LOAD_TIMEOUT_MS);

    try {
      const bundle = await getProjectBundle(projectId);
      clearTimeout(tidRef.current!);
      if (!activeRef.current) return;
      setProject(bundle.project);
      setMembers(bundle.members);
      setPlaces(bundle.places);
      setInviteCode(bundle.project?.inviteCode ?? null);
      setLoadStatus("loaded");
    } catch (error) {
      clearTimeout(tidRef.current!);
      if (!activeRef.current) return;
      const msg = getErrorMessage(error);
      if (msg === "ACCESS_DENIED") {
        setLoadStatus("access-denied");
      } else {
        console.error("[먹킷맵]", error);
        setLoadStatus("network-error");
      }
    }
  }, [projectId]);

  useEffect(() => {
    // Supabase 모드: auth 로딩이 끝날 때까지 대기
    if (isSupabaseConfigured() && authLoading) return;
    // Supabase 모드: 로그인 안 됐으면 fetch 자체를 하지 않음 (NeedLoginScreen 표시)
    if (isSupabaseConfigured() && !user) return;
    refreshProject();
    return () => {
      activeRef.current = false;
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, [refreshProject, authLoading, user]);

  // 멤버 0명이면 온보딩 모달 자동 오픈
  useEffect(() => {
    if (
      !isSupabaseConfigured() &&
      loadStatus === "loaded" &&
      project !== null &&
      members.length === 0 &&
      !onboardingShownRef.current
    ) {
      onboardingShownRef.current = true;
      setSheet({ kind: "onboarding" });
    }
  }, [loadStatus, project, members.length]);

  // ── 필터 ─────────────────────────────────────────────────
  const filteredPlaces = useMemo(
    () =>
      places.filter((p) => {
        const memberOk = filters.memberId === "전체" || p.memberId === filters.memberId;
        const catOk = filters.category === "전체" || p.category === filters.category;
        const tagOk = filters.tag === "전체" || p.tags.includes(filters.tag);
        return memberOk && catOk && tagOk;
      }),
    [filters, places]
  );

  const tagOptions = useMemo(() => uniqueTags(places), [places]);

  const editingPlace =
    sheet.kind === "place-edit"
      ? places.find((p) => p.id === sheet.placeId) ?? null
      : null;

  const detailPlace =
    sheet.kind === "place-detail"
      ? filteredPlaces.find((p) => p.id === sheet.placeId) ??
        places.find((p) => p.id === sheet.placeId) ??
        null
      : null;

  useEffect(() => {
    if (selectedPlaceId && !filteredPlaces.some((p) => p.id === selectedPlaceId))
      setSelectedPlaceId(null);
  }, [filteredPlaces, selectedPlaceId]);

  // ── 핸들러 ──────────────────────────────────────────────
  async function handleAddMember(
    input: Parameters<typeof createMember>[1],
    closeAfter = false
  ) {
    try {
      await createMember(projectId, input, user?.id ?? undefined);
      await refreshProject();
      if (closeAfter) setSheet({ kind: "closed" });
      toast.show({ title: "참여자가 추가됐어요", tone: "success" });
    } catch (err) {
      console.error(err);
      toast.show({
        title: "참여자 추가에 실패했어요",
        description: getErrorMessage(err),
        tone: "error"
      });
    }
  }

  async function handleDeleteMember(member: Member) {
    try {
      await deleteMember(member.id);
      setSelectedPlaceId(null);
      await refreshProject();
      toast.show({ title: `${member.nickname} 참여자를 삭제했어요`, tone: "info" });
    } catch (err) {
      console.error(err);
      toast.show({
        title: "참여자 삭제에 실패했어요",
        description: getErrorMessage(err),
        tone: "error"
      });
    }
  }

  async function handleSubmitPlace(input: PlaceCreateInput) {
    const targetEditing = editingPlace;
    try {
      const saved = targetEditing
        ? await updatePlace(targetEditing.id, input)
        : await createPlace(projectId, input);
      await refreshProject();
      setPickedLocation(null);
      if (saved) {
        setSelectedPlaceId(saved.id);
        setSheet({ kind: "place-detail", placeId: saved.id });
      } else {
        setSheet({ kind: "closed" });
      }
      toast.show({
        title: targetEditing ? "장소를 수정했어요" : "장소를 추가했어요",
        tone: "success"
      });
    } catch (err) {
      console.error(err);
      toast.show({
        title: targetEditing ? "장소 수정에 실패했어요" : "장소 추가에 실패했어요",
        description: getErrorMessage(err),
        tone: "error"
      });
    }
  }

  async function handleDeletePlace(place: Place) {
    try {
      await deletePlace(place.id);
      if (selectedPlaceId === place.id) setSelectedPlaceId(null);
      if (
        (sheet.kind === "place-edit" || sheet.kind === "place-detail") &&
        sheet.placeId === place.id
      )
        setSheet({ kind: "closed" });
      await refreshProject();
      toast.show({ title: `${place.name}을(를) 삭제했어요`, tone: "info" });
    } catch (err) {
      console.error(err);
      toast.show({
        title: "장소 삭제에 실패했어요",
        description: getErrorMessage(err),
        tone: "error"
      });
    }
  }

  async function handleShare() {
    const url = inviteCode
      ? `${window.location.origin}/invite/${inviteCode}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setInviteCopied(true);
    toast.show({ title: "초대 링크를 복사했어요", tone: "success" });
    setTimeout(() => setInviteCopied(false), 1600);
  }

  // 초대 링크 생성/재생성
  async function handleGenerateInvite() {
    if (!isOwner) return;
    setGeneratingInvite(true);
    try {
      const code = await regenerateInviteCode(projectId);
      setInviteCode(code);
      const inviteUrl = `${window.location.origin}/invite/${code}`;
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      toast.show({
        title: "초대 링크를 생성했어요",
        description: "클립보드에 복사됐어요.",
        tone: "success"
      });
    } catch (err) {
      console.error(err);
      toast.show({ title: "초대 링크 생성에 실패했어요", tone: "error" });
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteCode) return;
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.show({ title: "초대 링크를 복사했어요", tone: "success" });
  }

  async function handleChangeAccount() {
    await signOut();
    router.push("/auth");
  }

  // ── 화면 분기 ──────────────────────────────────────────────

  // Supabase 모드: 로그인 안 됐으면 로그인 유도
  if (isSupabaseConfigured() && !authLoading && !user) {
    return <NeedLoginScreen projectId={projectId} />;
  }

  if (loadStatus === "loading" || (isSupabaseConfigured() && authLoading)) {
    return <LoadingScreen />;
  }

  if (loadStatus === "access-denied") {
    return <AccessDeniedScreenV2
          onChangeAccount={handleChangeAccount}
          user={user}
          projectId={projectId}
        />;
  }

  if (loadStatus === "timeout" || loadStatus === "network-error") {
    return <LoadErrorScreen onRetry={refreshProject} />;
  }

  if (loadStatus === "loaded" && !project) {
    // Supabase 모드: RLS가 빈 배열로 막은 것 → 접근 권한 없음
    if (isSupabaseConfigured()) {
      return <AccessDeniedScreenV2
          onChangeAccount={handleChangeAccount}
          user={user}
          projectId={projectId}
        />;
    }
    return <NotFoundScreen />;
  }

  if (!project) return null;

  if (isSupabaseConfigured() && !myMember) {
    return <AccessDeniedScreenV2
          onChangeAccount={handleChangeAccount}
          user={user}
          projectId={projectId}
        />;
  }

  const hasNoPlaces = places.length === 0;

  return (
    <main className="min-h-screen pb-20">
      {/* ── Topbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-[500] border-b border-[var(--border)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
          <Link className="icon-button" href="/" aria-label="프로젝트 목록으로">
            <ArrowLeft size={17} />
          </Link>

          <Link className="shrink-0" href="/" aria-label="먹킷맵">
            <GhostlyLogo className="sm:hidden" variant="mark" />
            <GhostlyLogo className="hidden w-[132px] sm:inline-flex" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-bold leading-tight text-slate-900">
              {project.name}
            </h1>
            <p className="truncate text-[12px] font-semibold text-slate-500">
              {project.description || "설명이 없는 프로젝트"}
            </p>
          </div>

          {/* 참여자 */}
          <button
            className="chip"
            onClick={() => setSheet({ kind: "members" })}
            title="참여자 관리"
            type="button"
          >
            <Users size={14} />
            {members.length}명
          </button>

          {/* 초대 링크 (admin) */}
          {canManageMembers && (
            <button
              className="btn-ghost"
              onClick={inviteCode ? handleCopyInvite : handleGenerateInvite}
              disabled={generatingInvite}
              title="초대 링크"
              type="button"
            >
              {generatingInvite ? (
                <RotateCcw size={16} className="animate-spin" />
              ) : (
                <Link2 size={16} />
              )}
              <span className="hidden sm:inline">초대</span>
            </button>
          )}

          {/* 공유 (초대 링크 복사) */}
          <button
            className={inviteCopied ? "btn-soft" : "btn-ghost"}
            onClick={handleShare}
            type="button"
          >
            {inviteCopied ? <Check size={16} /> : <Link2 size={16} />}
            {inviteCopied ? "복사됨" : "공유"}
          </button>
        </div>

        {/* 필터 */}
        <div className="border-t border-[var(--border-soft)] bg-white/70">
          <div className="mx-auto max-w-[1680px] px-4 py-3 sm:px-6 lg:px-10">
            <FilterBar
              filters={filters}
              members={members}
              tags={tagOptions}
              onChange={setFilters}
            />
          </div>
        </div>
      </header>

      {/* ── Workspace ─────────────────────────────────────── */}
      {hasNoPlaces ? (
        <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-10">
          <SelectedMapView
            members={members}
            onPickLocation={
              canEdit
                ? (location) => {
                    setPickedLocation(location);
                    setSelectedPlaceId(null);
                    setSheet({ kind: "place-create" });
                  }
                : undefined
            }
            onSelectPlace={setSelectedPlaceId}
            onOpenDetail={(id) => {
              setSelectedPlaceId(id);
              setSheet({ kind: "place-detail", placeId: id });
            }}
            places={[]}
            selectedPlaceId={null}
          />
          {canEdit && (
            <div className="mt-5">
              <EmptyPlacesState onAddPlace={() => setSheet({ kind: "place-create" })} />
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1680px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-10">
          <SelectedMapView
            members={members}
            onPickLocation={
              canEdit
                ? (location) => {
                    setPickedLocation(location);
                    setSelectedPlaceId(null);
                    setSheet({ kind: "place-create" });
                  }
                : undefined
            }
            onSelectPlace={setSelectedPlaceId}
            onOpenDetail={(id) => {
              setSelectedPlaceId(id);
              setSheet({ kind: "place-detail", placeId: id });
            }}
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
          />
          <PlaceList
            members={members}
            onDelete={canEdit ? handleDeletePlace : undefined}
            onEdit={canEdit ? (p) => {
              setPickedLocation(null);
              setSheet({ kind: "place-edit", placeId: p.id });
            } : undefined}
            onSelect={(id) => {
              setSelectedPlaceId(id);
              setSheet({ kind: "place-detail", placeId: id });
            }}
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
            totalCount={places.length}
          />
        </div>
      )}

      {/* ── FAB (편집 권한 있을 때만) ────────────────────── */}
      {canEdit && (
        <button
          className="fab fixed bottom-6 right-6 z-[600]"
          onClick={() => {
            setPickedLocation(null);
            setSheet({ kind: "place-create" });
          }}
          type="button"
          aria-label="장소 추가"
        >
          <Plus size={18} />
          장소 추가
        </button>
      )}

      {/* ── Sheets ────────────────────────────────────────── */}

      {/* 온보딩 */}
      <Sheet
        open={sheet.kind === "onboarding"}
        onClose={() => setSheet({ kind: "closed" })}
        title="내 정보 설정"
      >
        <OnboardingContent onSubmit={(input) => handleAddMember(input, true)} />
      </Sheet>

      {/* 참여자 관리 */}
      <Sheet
        open={sheet.kind === "members"}
        onClose={() => setSheet({ kind: "closed" })}
        title="참여자"
        description="참여자별 색상으로 마커가 구분돼요."
      >
        <div className="space-y-6">
          <MemberList
            members={members}
            onDelete={canManageMembers ? handleDeleteMember : undefined}
          />
          {/* 초대 링크 섹션 (admin) */}
          {canManageMembers && isSupabaseConfigured() && (
            <div className="rounded-xl border border-[var(--border-soft)] p-4">
              <p className="caption mb-2">초대 링크</p>
              {inviteCode ? (
                <div className="flex flex-col gap-2">
                  <code className="block truncate rounded-lg bg-slate-50 px-3 py-2 text-[12px] font-mono text-slate-600">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteCode}`}
                  </code>
                  <div className="flex gap-2">
                    <button className="btn-ghost flex-1 justify-center text-[13px]" onClick={handleCopyInvite}>
                      <Link2 size={13} />
                      복사
                    </button>
                    <button
                      className="btn-ghost flex-1 justify-center text-[13px] text-red-500 hover:border-red-200 hover:bg-red-50"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                    >
                      <RotateCcw size={13} />
                      재생성
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    재생성하면 기존 링크는 무효화돼요.
                  </p>
                </div>
              ) : (
                <button
                  className="btn-primary w-full justify-center text-[13px]"
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                >
                  <Link2 size={13} />
                  초대 링크 생성
                </button>
              )}
            </div>
          )}
          {/* admin만 새 참여자 직접 추가 */}
          {canManageMembers && (
            <div className="border-t border-[var(--border-soft)] pt-6">
              <p className="caption mb-3">새 참여자 직접 추가</p>
              <MemberForm
                defaultRole="editor"
                onSubmit={(input) => handleAddMember(input)}
              />
            </div>
          )}
        </div>
      </Sheet>

      {/* 장소 추가/수정 */}
      <Sheet
        open={sheet.kind === "place-create" || sheet.kind === "place-edit"}
        onClose={() => {
          setSheet({ kind: "closed" });
          setPickedLocation(null);
        }}
        title={editingPlace ? "장소 수정" : "장소 추가"}
        description={
          editingPlace
            ? "정보를 수정하고 저장하세요."
            : "네이버에서 검색하거나 직접 입력해 등록하세요."
        }
        width={520}
      >
        {!editingPlace && (
          <div className="mb-6">
            <NaverPlaceSearch onPickPlace={(loc) => setPickedLocation(loc)} />
          </div>
        )}
        <PlaceForm
          initialPlace={editingPlace}
          key={editingPlace?.id ?? "new-place"}
          members={members}
          onCancelEdit={() => {
            setSheet({ kind: "closed" });
            setPickedLocation(null);
          }}
          onSubmit={handleSubmitPlace}
          pickedLocation={pickedLocation}
        />
      </Sheet>

      {/* 장소 상세 */}
      <Sheet
        open={sheet.kind === "place-detail" && Boolean(detailPlace)}
        onClose={() => setSheet({ kind: "closed" })}
        title="장소 상세"
      >
        {detailPlace && (
          <PlaceDetailCard
            member={getMemberForPlace(detailPlace, members)}
            onEdit={
              canEdit
                ? () => setSheet({ kind: "place-edit", placeId: detailPlace.id })
                : undefined
            }
            onDelete={canEdit ? () => handleDeletePlace(detailPlace) : undefined}
            place={detailPlace}
          />
        )}
      </Sheet>
    </main>
  );
}

export function ProjectPageClient(props: ProjectPageClientProps) {
  return (
    <ToastProvider>
      <ProjectContent {...props} />
    </ToastProvider>
  );
}
