"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Home, MapPin, Plus, RefreshCw, Share2, Users } from "lucide-react";
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
  updatePlace
} from "@/lib/supabaseStorage";
import { getMemberForPlace, uniqueTags } from "@/lib/utils";

// 프로젝트 로딩 최대 5초
const LOAD_TIMEOUT_MS = 5000;

const LeafletMapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <MapSkeleton />
  }
);

const NaverMapView = dynamic(
  () => import("@/components/NaverMapView").then((m) => m.NaverMapView),
  {
    ssr: false,
    loading: () => <MapSkeleton />
  }
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

// ── 로딩 상태 ─────────────────────────────────────────────────────
type LoadStatus =
  | "loading"       // API 응답 대기 중
  | "loaded"        // 성공
  | "timeout"       // 5초 초과 → 네트워크 오류 가능성
  | "network-error" // fetch 자체가 throw

type ProjectPageClientProps = {
  projectId: string;
};

type SheetMode =
  | { kind: "closed" }
  | { kind: "onboarding" }
  | { kind: "members" }
  | { kind: "place-create" }
  | { kind: "place-edit"; placeId: string }
  | { kind: "place-detail"; placeId: string };

// ── 로딩 화면 ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <span className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          지도 불러오는 중…
        </span>
        <p className="text-xs font-semibold text-slate-400">잠깐만요, 최대 5초 기다릴게요</p>
      </div>
    </main>
  );
}

// ── 타임아웃 / 네트워크 에러 화면 ─────────────────────────────────
function LoadErrorScreen({
  onRetry
}: {
  onRetry: () => void;
}) {
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
          <button
            className="btn-primary w-full justify-center"
            onClick={onRetry}
          >
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

// ── 프로젝트 미존재 화면 ──────────────────────────────────────────
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
            초대 링크 다시 입력
          </Link>
        </div>
      </section>
    </main>
  );
}

// ── 빈 장소 상태 ──────────────────────────────────────────────────
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

// ── 온보딩 시트 내용 ──────────────────────────────────────────────
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
          <br />
          친구들이 누가 추천했는지 색깔로 알아볼 수 있어요.
        </p>
      </div>
      <MemberForm onSubmit={onSubmit} />
    </div>
  );
}

// ── 메인 컨텐츠 ───────────────────────────────────────────────────
function ProjectContent({ projectId }: ProjectPageClientProps) {
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [sheet, setSheet] = useState<SheetMode>({ kind: "closed" });
  const [copied, setCopied] = useState(false);

  // 온보딩을 이미 보여줬는지 추적 (새로고침마다 다시 뜨지 않도록)
  const onboardingShownRef = useRef(false);
  // 진행 중 요청 취소용
  const activeRef = useRef(true);
  const tidRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 프로젝트 로딩 ──────────────────────────────────────────
  const refreshProject = useCallback(async () => {
    if (tidRef.current) clearTimeout(tidRef.current);
    activeRef.current = true;
    setLoadStatus("loading");

    // 5초 타임아웃
    tidRef.current = setTimeout(() => {
      if (!activeRef.current) return;
      activeRef.current = false;
      console.error("[먹킷맵] 프로젝트 로딩 타임아웃:", projectId);
      setLoadStatus("timeout");
    }, LOAD_TIMEOUT_MS);

    try {
      const bundle = await getProjectBundle(projectId);
      clearTimeout(tidRef.current!);
      if (!activeRef.current) return;
      setProject(bundle.project);
      setMembers(bundle.members);
      setPlaces(bundle.places);
      setLoadStatus("loaded");
    } catch (error) {
      clearTimeout(tidRef.current!);
      if (!activeRef.current) return;
      console.error("[먹킷맵] 프로젝트 로딩 실패:", error);
      toast.show({
        title: "지도 데이터를 불러오지 못했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
      setLoadStatus("network-error");
    }
  }, [projectId, toast]);

  useEffect(() => {
    refreshProject();
    return () => {
      activeRef.current = false;
      if (tidRef.current) clearTimeout(tidRef.current);
    };
  }, [refreshProject]);

  // ── 멤버 0명이면 온보딩 모달 자동 오픈 ───────────────────
  useEffect(() => {
    if (
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
      places.filter((place) => {
        const memberMatches =
          filters.memberId === "전체" || place.memberId === filters.memberId;
        const categoryMatches =
          filters.category === "전체" || place.category === filters.category;
        const tagMatches =
          filters.tag === "전체" || place.tags.includes(filters.tag);
        return memberMatches && categoryMatches && tagMatches;
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
    if (selectedPlaceId && !filteredPlaces.some((p) => p.id === selectedPlaceId)) {
      setSelectedPlaceId(null);
    }
  }, [filteredPlaces, selectedPlaceId]);

  // ── 이벤트 핸들러 ──────────────────────────────────────────
  function handleSelectPlace(placeId: string) {
    setSelectedPlaceId(placeId);
  }

  function handleOpenDetail(placeId: string) {
    setSelectedPlaceId(placeId);
    setSheet({ kind: "place-detail", placeId });
  }

  async function handleAddMember(
    input: Parameters<typeof createMember>[1],
    closeSheetAfter = false
  ) {
    try {
      await createMember(projectId, input);
      await refreshProject();
      if (closeSheetAfter) setSheet({ kind: "closed" });
      toast.show({ title: "참여자가 추가됐어요", tone: "success" });
    } catch (error) {
      console.error(error);
      toast.show({
        title: "참여자 추가에 실패했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  // 온보딩 전용: 추가 후 시트를 닫음
  function handleOnboardingSubmit(input: Parameters<typeof createMember>[1]) {
    handleAddMember(input, true);
  }

  async function handleDeleteMember(member: Member) {
    try {
      await deleteMember(member.id);
      setSelectedPlaceId(null);
      await refreshProject();
      toast.show({
        title: `${member.nickname} 참여자를 삭제했어요`,
        description: "이 참여자가 등록한 장소도 함께 삭제됐습니다.",
        tone: "info"
      });
    } catch (error) {
      console.error(error);
      toast.show({
        title: "참여자 삭제에 실패했어요",
        description: getErrorMessage(error),
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
    } catch (error) {
      console.error(error);
      toast.show({
        title: targetEditing ? "장소 수정에 실패했어요" : "장소 추가에 실패했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  async function handleDeletePlace(place: Place) {
    try {
      await deletePlace(place.id);
      if (selectedPlaceId === place.id) setSelectedPlaceId(null);
      if (sheet.kind === "place-edit" && sheet.placeId === place.id)
        setSheet({ kind: "closed" });
      if (sheet.kind === "place-detail" && sheet.placeId === place.id)
        setSheet({ kind: "closed" });
      await refreshProject();
      toast.show({ title: `${place.name}을(를) 삭제했어요`, tone: "info" });
    } catch (error) {
      console.error(error);
      toast.show({
        title: "장소 삭제에 실패했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    }
  }

  function startEditPlace(place: Place) {
    setPickedLocation(null);
    setSheet({ kind: "place-edit", placeId: place.id });
  }

  function startCreatePlace() {
    setPickedLocation(null);
    setSheet({ kind: "place-create" });
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopied(true);
    toast.show({ title: "공유 링크를 복사했어요", tone: "success" });
    window.setTimeout(() => setCopied(false), 1600);
  }

  // ── 로딩 / 에러 화면 분기 ──────────────────────────────────
  if (loadStatus === "loading") {
    return <LoadingScreen />;
  }

  if (loadStatus === "timeout" || loadStatus === "network-error") {
    return <LoadErrorScreen onRetry={refreshProject} />;
  }

  // loaded 상태에서 project가 null → 잘못된 ID
  if (loadStatus === "loaded" && !project) {
    return <NotFoundScreen />;
  }

  // 여기서부터 project는 확실히 존재
  if (!project) return null;

  const hasNoPlaces = places.length === 0;

  return (
    <main className="min-h-screen pb-20">
      {/* ── Topbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-[500] border-b border-[var(--border)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-10">
          <Link
            className="icon-button"
            href="/"
            title="프로젝트 목록"
            aria-label="프로젝트 목록으로"
          >
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

          <button
            className="chip"
            onClick={() => setSheet({ kind: "members" })}
            title="참여자 관리"
            type="button"
          >
            <Users size={14} />
            {members.length}명
          </button>

          <button
            className={copied ? "btn-soft" : "btn-ghost"}
            onClick={handleShare}
            type="button"
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "복사됨" : "공유"}
          </button>
        </div>

        {/* Filter chip bar */}
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
        /* 장소가 하나도 없을 때: 지도 + 빈 상태 안내 */
        <div className="mx-auto max-w-[1680px] gap-5 px-4 py-5 sm:px-6 lg:px-10">
          <SelectedMapView
            members={members}
            onPickLocation={(location) => {
              setPickedLocation(location);
              setSelectedPlaceId(null);
              setSheet({ kind: "place-create" });
            }}
            onSelectPlace={handleSelectPlace}
            onOpenDetail={handleOpenDetail}
            places={[]}
            selectedPlaceId={null}
          />
          <div className="mt-5">
            <EmptyPlacesState onAddPlace={startCreatePlace} />
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1680px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-10">
          <SelectedMapView
            members={members}
            onPickLocation={(location) => {
              setPickedLocation(location);
              setSelectedPlaceId(null);
              setSheet({ kind: "place-create" });
            }}
            onSelectPlace={handleSelectPlace}
            onOpenDetail={handleOpenDetail}
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
          />

          <PlaceList
            members={members}
            onDelete={handleDeletePlace}
            onEdit={startEditPlace}
            onSelect={handleOpenDetail}
            places={filteredPlaces}
            selectedPlaceId={selectedPlaceId}
            totalCount={places.length}
          />
        </div>
      )}

      {/* ── FAB ───────────────────────────────────────────── */}
      <button
        className="fab fixed bottom-6 right-6 z-[600]"
        onClick={startCreatePlace}
        type="button"
        aria-label="장소 추가"
      >
        <Plus size={18} />
        장소 추가
      </button>

      {/* ── Sheets ────────────────────────────────────────── */}

      {/* 온보딩: 닉네임·마커색 설정 */}
      <Sheet
        open={sheet.kind === "onboarding"}
        onClose={() => setSheet({ kind: "closed" })}
        title="내 정보 설정"
      >
        <OnboardingContent onSubmit={handleOnboardingSubmit} />
      </Sheet>

      {/* 참여자 관리 */}
      <Sheet
        open={sheet.kind === "members"}
        onClose={() => setSheet({ kind: "closed" })}
        title="참여자"
        description="참여자별 색상으로 마커가 구분돼요."
      >
        <div className="space-y-6">
          <MemberList members={members} onDelete={handleDeleteMember} />
          <div className="border-t border-[var(--border-soft)] pt-6">
            <p className="caption mb-3">새 참여자</p>
            <MemberForm onSubmit={(input) => handleAddMember(input)} />
          </div>
        </div>
      </Sheet>

      {/* 장소 추가 / 수정 */}
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
        {editingPlace ? null : (
          <div className="mb-6">
            <NaverPlaceSearch
              onPickPlace={(location) => {
                setPickedLocation(location);
              }}
            />
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
        {detailPlace ? (
          <PlaceDetailCard
            member={getMemberForPlace(detailPlace, members)}
            onEdit={() =>
              setSheet({ kind: "place-edit", placeId: detailPlace.id })
            }
            onDelete={() => handleDeletePlace(detailPlace)}
            place={detailPlace}
          />
        ) : null}
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
