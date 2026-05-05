/**
 * supabaseStorage.ts
 *
 * Supabase 설정 여부에 따라 두 가지 저장소 중 하나를 사용합니다.
 *  - Supabase 설정 O → @supabase/supabase-js 클라이언트 (RLS + Auth 포함)
 *  - Supabase 설정 X → 로컬스토리지 (개발/데모용)
 */

import * as localStore from "@/lib/storage";
import type {
  Member,
  MemberCreateInput,
  MemberRole,
  Place,
  PlaceCreateInput,
  Project,
  ProjectCounts,
  ProjectCreateInput
} from "@/lib/types";
import { nowIso } from "@/lib/utils";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";

// ── Row 타입 (Supabase DB 컬럼명) ─────────────────────────────────

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  project_id: string;
  user_id: string | null;
  nickname: string;
  marker_color: string;
  role: string;
  created_at: string;
};

type PlaceRow = {
  id: string;
  project_id: string;
  member_id: string | null;
  name: string;
  naver_map_url: string | null;
  address: string | null;
  lat: number;
  lng: number;
  category: Place["category"];
  tags: string[] | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

// ── Mapper ────────────────────────────────────────────────────────

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    inviteCode: row.invite_code ?? null,
    createdAt: row.created_at
  };
}

function normalizeRole(role: string | null | undefined): MemberRole {
  if (role === "owner" || role === "editor" || role === "viewer") return role;
  if (role === "admin") return "owner";
  return "editor";
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id ?? null,
    nickname: row.nickname,
    markerColor: row.marker_color,
    role: normalizeRole(row.role),
    createdAt: row.created_at
  };
}

function mapPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    projectId: row.project_id,
    memberId: row.member_id ?? "",
    name: row.name,
    naverMapUrl: row.naver_map_url ?? "",
    address: row.address ?? "",
    lat: row.lat,
    lng: row.lng,
    category: row.category,
    tags: row.tags ?? [],
    comment: row.comment ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── 헬퍼 ──────────────────────────────────────────────────────────

function supabase() {
  return getSupabaseClient();
}

function throwOnError(error: { message?: string } | null, fallback = "알 수 없는 오류") {
  if (error) throw new Error(error.message ?? fallback);
}

// ── Projects ──────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return localStore.getProjects();

  const { data, error } = await supabase()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  throwOnError(error);
  return (data as ProjectRow[]).map(mapProject);
}

export async function getProjectCounts(
  projects: Project[]
): Promise<Record<string, ProjectCounts>> {
  if (!isSupabaseConfigured()) {
    const store = localStore.getStore();
    return Object.fromEntries(
      projects.map((p) => [
        p.id,
        {
          memberCount: store.members.filter((m) => m.projectId === p.id).length,
          placeCount: store.places.filter((pl) => pl.projectId === p.id).length,
          myRole: store.members.find((m) => m.projectId === p.id)?.role ?? "owner"
        }
      ])
    );
  }

  const [
    { data: members, error: memberError },
    { data: places, error: placeError },
    {
      data: { user }
    }
  ] = await Promise.all([
    supabase().from("members").select("project_id,user_id,role"),
    supabase().from("places").select("project_id"),
    supabase().auth.getUser()
  ]);

  throwOnError(memberError);
  throwOnError(placeError);

  return Object.fromEntries(
    projects.map((p) => [
      p.id,
      {
        memberCount: (members ?? []).filter((m) => m.project_id === p.id).length,
        placeCount: (places ?? []).filter((pl) => pl.project_id === p.id).length,
        myRole: (() => {
          const row = (members ?? []).find(
            (m) => m.project_id === p.id && m.user_id === user?.id
          );
          return row ? normalizeRole(row.role) : null;
        })()
      }
    ])
  );
}

export async function getProjectBundle(projectId: string) {
  if (!isSupabaseConfigured()) {
    return {
      project: localStore.getProjectById(projectId),
      members: localStore.getMembersByProject(projectId),
      places: localStore.getPlacesByProject(projectId)
    };
  }

  const [
    { data: projectRows, error: pErr },
    { data: memberRows, error: mErr },
    { data: placeRows, error: plErr }
  ] = await Promise.all([
    supabase().from("projects").select("*").eq("id", projectId).limit(1),
    supabase()
      .from("members")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase()
      .from("places")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
  ]);

  // RLS가 막으면 빈 배열이 오거나 에러가 옴
  if (pErr) throw new Error(pErr.message);

  const project = projectRows?.[0] ? mapProject(projectRows[0] as ProjectRow) : null;

  // 프로젝트가 없으면 null 반환 (NotFoundScreen 표시용)
  if (!project) {
    return { project: null, members: [], places: [] };
  }

  // 멤버/장소 에러는 접근 권한 없음으로 처리
  if (mErr?.code === "42501" || plErr?.code === "42501") {
    throw new Error("ACCESS_DENIED");
  }

  return {
    project,
    members: (memberRows as MemberRow[] ?? []).map(mapMember),
    places: (placeRows as PlaceRow[] ?? []).map(mapPlace)
  };
}

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  if (!isSupabaseConfigured()) return localStore.createProject(input);

  // SECURITY DEFINER RPC: 프로젝트 생성 + owner 등록을 RLS 우회해서 처리
  const { data, error } = await supabase().rpc("create_project_as_owner", {
    p_name: input.name.trim(),
    p_description: input.description.trim()
  });

  throwOnError(error);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) throw new Error("프로젝트 생성에 실패했어요");
  return mapProject(rows[0] as ProjectRow);
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    localStore.deleteProject(projectId);
    return;
  }

  // 장소 → 멤버 → 프로젝트 순으로 삭제 (DB CASCADE가 없는 경우 방어)
  await supabase().from("places").delete().eq("project_id", projectId);
  await supabase().from("members").delete().eq("project_id", projectId);

  const { error } = await supabase()
    .from("projects")
    .delete()
    .eq("id", projectId);

  throwOnError(error);
}

export async function updateProject(
  projectId: string,
  input: ProjectCreateInput
): Promise<Project | null> {
  if (!isSupabaseConfigured()) return localStore.updateProject(projectId, input);

  const { data, error } = await supabase()
    .from("projects")
    .update({
      name: input.name.trim(),
      description: input.description.trim()
    })
    .eq("id", projectId)
    .select()
    .single();

  throwOnError(error);
  return data ? mapProject(data as ProjectRow) : null;
}

// ── Invite Code ───────────────────────────────────────────────────

/** 초대 코드를 새로 발급(재생성)하고 반환 */
export async function regenerateInviteCode(projectId: string): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase가 필요합니다.");

  // crypto.randomUUID() 또는 random 문자열로 생성
  const code =
    typeof crypto !== "undefined"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 14);

  const { data, error } = await supabase()
    .from("projects")
    .update({ invite_code: code })
    .eq("id", projectId)
    .select("invite_code")
    .single();

  throwOnError(error);
  return (data as { invite_code: string }).invite_code;
}

/** 초대 코드로 프로젝트 조회 (로그인 없이도 접근 가능하도록 RLS 설정 필요) */
export async function getProjectByInviteCode(
  code: string
): Promise<Project | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase().rpc("get_project_by_invite_code", {
    p_invite_code: code
  });

  throwOnError(error);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) return null;
  return mapProject(rows[0] as ProjectRow);
}

export async function joinProjectByInviteCode(
  inviteCode: string,
  input: Pick<MemberCreateInput, "nickname" | "markerColor">
): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase가 필요합니다.");

  const { data, error } = await supabase().rpc("join_project_by_invite", {
    p_invite_code: inviteCode,
    p_nickname: input.nickname.trim(),
    p_marker_color: input.markerColor
  });

  throwOnError(error);
  return String(data);
}

/** 현재 로그인 유저가 이미 해당 프로젝트 멤버인지 확인 */
export async function checkMembership(
  projectId: string,
  userId: string
): Promise<Member | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await supabase()
    .from("members")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .limit(1);

  if (!data || data.length === 0) return null;
  return mapMember(data[0] as MemberRow);
}

// ── Members ───────────────────────────────────────────────────────

export async function createMember(
  projectId: string,
  input: MemberCreateInput,
  userId?: string
): Promise<Member> {
  if (!isSupabaseConfigured()) return localStore.createMember(projectId, input);

  const { data, error } = await supabase()
    .from("members")
    .insert({
      project_id: projectId,
      user_id: userId ?? null,
      nickname: input.nickname.trim(),
      marker_color: input.markerColor,
      role: input.role
    })
    .select()
    .single();

  throwOnError(error);
  return mapMember(data as MemberRow);
}

export async function deleteMember(memberId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    localStore.deleteMember(memberId);
    return;
  }

  // 해당 멤버의 장소도 삭제
  await supabase().from("places").delete().eq("member_id", memberId);
  const { error } = await supabase().from("members").delete().eq("id", memberId);
  throwOnError(error);
}

export async function updateMember(
  memberId: string,
  input: MemberCreateInput
): Promise<Member | null> {
  if (!isSupabaseConfigured()) return localStore.updateMember(memberId, input);

  const { data, error } = await supabase()
    .from("members")
    .update({
      nickname: input.nickname.trim(),
      marker_color: input.markerColor,
      role: input.role
    })
    .eq("id", memberId)
    .select()
    .single();

  throwOnError(error);
  return data ? mapMember(data as MemberRow) : null;
}

// ── Places ────────────────────────────────────────────────────────

export async function createPlace(
  projectId: string,
  input: PlaceCreateInput
): Promise<Place> {
  if (!isSupabaseConfigured()) return localStore.createPlace(projectId, input);

  const now = nowIso();
  const { data, error } = await supabase()
    .from("places")
    .insert({
      project_id: projectId,
      member_id: input.memberId,
      name: input.name.trim(),
      naver_map_url: input.naverMapUrl.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      tags: input.tags,
      comment: input.comment.trim(),
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  throwOnError(error);
  return mapPlace(data as PlaceRow);
}

export async function updatePlace(
  placeId: string,
  input: PlaceCreateInput
): Promise<Place | null> {
  if (!isSupabaseConfigured()) return localStore.updatePlace(placeId, input);

  const { data, error } = await supabase()
    .from("places")
    .update({
      member_id: input.memberId,
      name: input.name.trim(),
      naver_map_url: input.naverMapUrl.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      tags: input.tags,
      comment: input.comment.trim(),
      updated_at: nowIso()
    })
    .eq("id", placeId)
    .select()
    .single();

  throwOnError(error);
  return data ? mapPlace(data as PlaceRow) : null;
}

export async function deletePlace(placeId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    localStore.deletePlace(placeId);
    return;
  }

  const { error } = await supabase().from("places").delete().eq("id", placeId);
  throwOnError(error);
}
