"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Plus, Share2, Users } from "lucide-react";
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

type ProjectPageClientProps = {
  projectId: string;
};

type SheetMode =
  | { kind: "closed" }
  | { kind: "members" }
  | { kind: "place-create" }
  | { kind: "place-edit"; placeId: string }
  | { kind: "place-detail"; placeId: string };

function ProjectContent({ projectId }: ProjectPageClientProps) {
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<SheetMode>({ kind: "closed" });
  const [copied, setCopied] = useState(false);

  const refreshProject = useCallback(async () => {
    try {
      const bundle = await getProjectBundle(projectId);
      setProject(bundle.project);
      setMembers(bundle.members);
      setPlaces(bundle.places);
    } catch (error) {
      console.error(error);
      toast.show({
        title: "프로젝트 데이터를 불러오지 못했어요",
        description: getErrorMessage(error),
        tone: "error"
      });
    } finally {
      setLoaded(true);
    }
  }, [projectId, toast]);

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

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
    if (
      selectedPlaceId &&
      !filteredPlaces.some((p) => p.id === selectedPlaceId)
    ) {
      setSelectedPlaceId(null);
    }
  }, [filteredPlaces, selectedPlaceId]);

  function handleSelectPlace(placeId: string) {
    // 마커 클릭 시: 선택 표시만 갱신 (팝업이 지도 위에서 정보 표시).
    setSelectedPlaceId(placeId);
  }

  function handleOpenDetail(placeId: string) {
    // 리스트 카드/팝업 [상세] 버튼: 선택 + 우측 시트 오픈.
    setSelectedPlaceId(placeId);
    setSheet({ kind: "place-detail", placeId });
  }

  async function handleAddMember(input: Parameters<typeof createMember>[1]) {
    try {
      await createMember(projectId, input);
      await refreshProject();
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
      toast.show({
        title: `${place.name}을(를) 삭제했어요`,
        tone: "info"
      });
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

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          프로젝트 불러오는 중
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="card max-w-md p-8 text-center">
          <h1 className="title">프로젝트를 찾을 수 없습니다</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            로컬 저장소에 없는 프로젝트이거나 다른 브라우저에서 만든 링크일 수 있어요.
          </p>
          <Link className="btn-primary mt-6" href="/">
            메인으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  const sheetOpen = sheet.kind !== "closed";

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
            <MemberForm onSubmit={handleAddMember} />
          </div>
        </div>
      </Sheet>

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
