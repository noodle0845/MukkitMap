import * as localStore from "@/lib/storage";
import type {
  Member,
  MemberCreateInput,
  Place,
  PlaceCreateInput,
  Project,
  ProjectCounts,
  ProjectCreateInput
} from "@/lib/types";
import { nowIso } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  project_id: string;
  nickname: string;
  marker_color: string;
  role: Member["role"];
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: row.created_at
  };
}

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    projectId: row.project_id,
    nickname: row.nickname,
    markerColor: row.marker_color,
    role: row.role,
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

async function request<T>(
  path: string,
  init: RequestInit = {},
  prefer = "return=representation"
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase 환경변수가 없습니다.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase 요청에 실패했습니다.");
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function getProjects() {
  if (!isSupabaseConfigured()) {
    return localStore.getProjects();
  }

  const rows = await request<ProjectRow[]>(
    "projects?select=*&order=created_at.desc"
  );
  return rows.map(mapProject);
}

export async function getProjectCounts(
  projects: Project[]
): Promise<Record<string, ProjectCounts>> {
  if (!isSupabaseConfigured()) {
    const store = localStore.getStore();
    return Object.fromEntries(
      projects.map((project) => [
        project.id,
        {
          memberCount: store.members.filter((m) => m.projectId === project.id).length,
          placeCount: store.places.filter((p) => p.projectId === project.id).length
        }
      ])
    );
  }

  const [members, places] = await Promise.all([
    request<Array<{ project_id: string }>>("members?select=project_id"),
    request<Array<{ project_id: string }>>("places?select=project_id")
  ]);

  return Object.fromEntries(
    projects.map((project) => [
      project.id,
      {
        memberCount: members.filter((m) => m.project_id === project.id).length,
        placeCount: places.filter((p) => p.project_id === project.id).length
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

  const encodedId = encodeURIComponent(projectId);
  const [projectRows, memberRows, placeRows] = await Promise.all([
    request<ProjectRow[]>(`projects?select=*&id=eq.${encodedId}&limit=1`),
    request<MemberRow[]>(
      `members?select=*&project_id=eq.${encodedId}&order=created_at.asc`
    ),
    request<PlaceRow[]>(
      `places?select=*&project_id=eq.${encodedId}&order=updated_at.desc`
    )
  ]);

  return {
    project: projectRows[0] ? mapProject(projectRows[0]) : null,
    members: memberRows.map(mapMember),
    places: placeRows.map(mapPlace)
  };
}

export async function createProject(input: ProjectCreateInput) {
  if (!isSupabaseConfigured()) {
    return localStore.createProject(input);
  }

  const rows = await request<ProjectRow[]>(
    "projects",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name.trim(),
        description: input.description.trim()
      })
    }
  );

  return mapProject(rows[0]);
}

export async function createMember(projectId: string, input: MemberCreateInput) {
  if (!isSupabaseConfigured()) {
    return localStore.createMember(projectId, input);
  }

  const rows = await request<MemberRow[]>(
    "members",
    {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        nickname: input.nickname.trim(),
        marker_color: input.markerColor,
        role: input.role
      })
    }
  );

  return mapMember(rows[0]);
}

export async function deleteMember(memberId: string) {
  if (!isSupabaseConfigured()) {
    localStore.deleteMember(memberId);
    return;
  }

  const encodedId = encodeURIComponent(memberId);
  await request("places?member_id=eq." + encodedId, { method: "DELETE" }, "return=minimal");
  await request("members?id=eq." + encodedId, { method: "DELETE" }, "return=minimal");
}

export async function createPlace(projectId: string, input: PlaceCreateInput) {
  if (!isSupabaseConfigured()) {
    return localStore.createPlace(projectId, input);
  }

  const now = nowIso();
  const rows = await request<PlaceRow[]>(
    "places",
    {
      method: "POST",
      body: JSON.stringify({
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
    }
  );

  return mapPlace(rows[0]);
}

export async function updatePlace(placeId: string, input: PlaceCreateInput) {
  if (!isSupabaseConfigured()) {
    return localStore.updatePlace(placeId, input);
  }

  const rows = await request<PlaceRow[]>(
    `places?id=eq.${encodeURIComponent(placeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        member_id: input.memberId,
        name: input.name.trim(),
        naver_map_url: input.naverMapUrl.trim(),
        address: input.address.trim(),
        lat: input.lat,
        lng: input.lng,
        category: input.category,
        tags: input.tags,
        comment: input.comment.trim()
      })
    }
  );

  return rows[0] ? mapPlace(rows[0]) : null;
}

export async function deletePlace(placeId: string) {
  if (!isSupabaseConfigured()) {
    localStore.deletePlace(placeId);
    return;
  }

  await request(
    `places?id=eq.${encodeURIComponent(placeId)}`,
    { method: "DELETE" },
    "return=minimal"
  );
}

export async function seedSampleData() {
  if (!isSupabaseConfigured()) {
    return localStore.seedSampleData();
  }

  const projects = await getProjects();
  const existing = projects.find((project) => project.name === "부산 친구 맛집지도");
  if (existing) {
    return existing;
  }

  const project = await createProject({
    name: "부산 친구 맛집지도",
    description:
      "친구들이 각자 추천한 부산 맛집, 카페, 술집, 디저트를 한 지도에 모았습니다."
  });

  const memberInputs: MemberCreateInput[] = [
    { nickname: "라면", markerColor: "#ef4444", role: "admin" },
    { nickname: "워렌", markerColor: "#3b82f6", role: "member" },
    { nickname: "존슨", markerColor: "#22c55e", role: "member" },
    { nickname: "베일", markerColor: "#f59e0b", role: "member" }
  ];

  const members = await Promise.all(
    memberInputs.map((member) => createMember(project.id, member))
  );

  const byNickname = Object.fromEntries(
    members.map((member) => [member.nickname, member.id])
  );

  const samplePlaces: PlaceCreateInput[] = [
    {
      memberId: byNickname["라면"],
      name: "전포 감성카페",
      naverMapUrl: "https://map.naver.com/p/search/전포%20감성카페",
      address: "부산 부산진구 전포동",
      lat: 35.1545,
      lng: 129.0636,
      category: "카페",
      tags: ["조용함", "디저트", "작업가능"],
      comment: "혼자 가도 어색하지 않고 오래 앉아있기 좋음"
    },
    {
      memberId: byNickname["워렌"],
      name: "서면 국밥집",
      naverMapUrl: "https://map.naver.com/p/search/서면%20국밥",
      address: "부산 부산진구 부전동",
      lat: 35.1576,
      lng: 129.0594,
      category: "밥집",
      tags: ["혼밥", "가성비", "해장"],
      comment: "혼자 먹기 편하고 회전이 빨라 부담 없음"
    },
    {
      memberId: byNickname["존슨"],
      name: "광안리 술집",
      naverMapUrl: "https://map.naver.com/p/search/광안리%20술집",
      address: "부산 수영구 광안동",
      lat: 35.1532,
      lng: 129.1186,
      category: "술집",
      tags: ["분위기", "야경", "2차"],
      comment: "바다 보고 가볍게 한잔하기 좋음"
    },
    {
      memberId: byNickname["베일"],
      name: "해운대 디저트샵",
      naverMapUrl: "https://map.naver.com/p/search/해운대%20디저트샵",
      address: "부산 해운대구 우동",
      lat: 35.1632,
      lng: 129.1636,
      category: "디저트",
      tags: ["선물", "사진", "달달함"],
      comment: "여행 기분 내기 좋은 디저트가 많음"
    }
  ];

  await Promise.all(samplePlaces.map((place) => createPlace(project.id, place)));

  return project;
}
