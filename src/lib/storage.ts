import type {
  Member,
  MemberCreateInput,
  Place,
  PlaceCreateInput,
  Project,
  ProjectCreateInput
} from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

const STORAGE_KEY = "mukkit-map-store-v1";

export type MukkitStore = {
  projects: Project[];
  members: Member[];
  places: Place[];
};

const EMPTY_STORE: MukkitStore = {
  projects: [],
  members: [],
  places: []
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeStore(value: unknown): MukkitStore {
  if (!value || typeof value !== "object") {
    return EMPTY_STORE;
  }

  const draft = value as Partial<MukkitStore>;

  return {
    projects: Array.isArray(draft.projects) ? draft.projects : [],
    members: Array.isArray(draft.members) ? draft.members : [],
    places: Array.isArray(draft.places) ? draft.places : []
  };
}

export function getStore(): MukkitStore {
  if (!canUseStorage()) {
    return EMPTY_STORE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeStore(raw ? JSON.parse(raw) : EMPTY_STORE);
  } catch {
    return EMPTY_STORE;
  }
}

export function saveStore(store: MukkitStore) {
  if (!canUseStorage()) {
    return;
  }

  // TODO: Supabase 연동
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getProjects() {
  return [...getStore().projects].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export function getProjectById(projectId: string) {
  return getStore().projects.find((project) => project.id === projectId) ?? null;
}

export function getMembersByProject(projectId: string) {
  return getStore()
    .members.filter((member) => member.projectId === projectId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function getPlacesByProject(projectId: string) {
  return getStore()
    .places.filter((place) => place.projectId === projectId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function createProject(input: ProjectCreateInput) {
  const store = getStore();
  const project: Project = {
    id: createId("project"),
    name: input.name.trim(),
    description: input.description.trim(),
    inviteCode: null,
    createdAt: nowIso()
  };

  saveStore({
    ...store,
    projects: [project, ...store.projects]
  });

  return project;
}

export function deleteProject(projectId: string) {
  const store = getStore();

  saveStore({
    projects: store.projects.filter((project) => project.id !== projectId),
    members: store.members.filter((member) => member.projectId !== projectId),
    places: store.places.filter((place) => place.projectId !== projectId)
  });
}

export function createMember(projectId: string, input: MemberCreateInput) {
  const store = getStore();
  const member: Member = {
    id: createId("member"),
    projectId,
    userId: null,
    nickname: input.nickname.trim(),
    markerColor: input.markerColor,
    role: input.role,
    createdAt: nowIso()
  };

  saveStore({
    ...store,
    members: [...store.members, member]
  });

  return member;
}

export function deleteMember(memberId: string) {
  const store = getStore();

  saveStore({
    ...store,
    members: store.members.filter((member) => member.id !== memberId),
    places: store.places.filter((place) => place.memberId !== memberId)
  });
}

export function createPlace(projectId: string, input: PlaceCreateInput) {
  const store = getStore();
  const now = nowIso();
  const place: Place = {
    id: createId("place"),
    projectId,
    memberId: input.memberId,
    name: input.name.trim(),
    naverMapUrl: input.naverMapUrl.trim(),
    address: input.address.trim(),
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    tags: input.tags,
    comment: input.comment.trim(),
    createdAt: now,
    updatedAt: now
  };

  saveStore({
    ...store,
    places: [place, ...store.places]
  });

  return place;
}

export function updatePlace(placeId: string, input: PlaceCreateInput) {
  const store = getStore();
  let updatedPlace: Place | null = null;

  const places = store.places.map((place) => {
    if (place.id !== placeId) {
      return place;
    }

    updatedPlace = {
      ...place,
      memberId: input.memberId,
      name: input.name.trim(),
      naverMapUrl: input.naverMapUrl.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      tags: input.tags,
      comment: input.comment.trim(),
      updatedAt: nowIso()
    };

    return updatedPlace;
  });

  saveStore({
    ...store,
    places
  });

  return updatedPlace;
}

export function deletePlace(placeId: string) {
  const store = getStore();

  saveStore({
    ...store,
    places: store.places.filter((place) => place.id !== placeId)
  });
}

export function seedSampleData() {
  const store = getStore();
  const existing = store.projects.find(
    (project) => project.name === "부산 친구 맛집지도"
  );

  if (existing) {
    return existing;
  }

  const createdAt = nowIso();
  const projectId = createId("project");
  const project: Project = {
    id: projectId,
    name: "부산 친구 맛집지도",
    description: "친구들이 각자 추천한 부산 맛집, 카페, 술집, 디저트를 한 지도에 모았습니다.",
    inviteCode: null,
    createdAt
  };

  const members: Member[] = [
    {
      id: createId("member"),
      projectId,
      userId: null,
      nickname: "라면",
      markerColor: "#ef4444",
      role: "admin",
      createdAt
    },
    {
      id: createId("member"),
      projectId,
      userId: null,
      nickname: "워렌",
      markerColor: "#3b82f6",
      role: "member",
      createdAt
    },
    {
      id: createId("member"),
      projectId,
      userId: null,
      nickname: "존슨",
      markerColor: "#22c55e",
      role: "member",
      createdAt
    },
    {
      id: createId("member"),
      projectId,
      userId: null,
      nickname: "베일",
      markerColor: "#f59e0b",
      role: "member",
      createdAt
    }
  ];

  const memberByName = Object.fromEntries(
    members.map((member) => [member.nickname, member.id])
  );

  const places: Place[] = [
    {
      id: createId("place"),
      projectId,
      memberId: memberByName["라면"],
      name: "전포 감성카페",
      naverMapUrl:
        "https://map.naver.com/p/search/%EC%A0%84%ED%8F%AC%20%EA%B0%90%EC%84%B1%EC%B9%B4%ED%8E%98",
      address: "부산 부산진구 전포동",
      lat: 35.1545,
      lng: 129.0636,
      category: "카페",
      tags: ["조용함", "디저트", "작업가능"],
      comment: "혼자 가도 어색하지 않고 오래 앉아있기 좋음",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: createId("place"),
      projectId,
      memberId: memberByName["워렌"],
      name: "서면 국밥집",
      naverMapUrl:
        "https://map.naver.com/p/search/%EC%84%9C%EB%A9%B4%20%EA%B5%AD%EB%B0%A5",
      address: "부산 부산진구 부전동",
      lat: 35.1576,
      lng: 129.0594,
      category: "밥집",
      tags: ["혼밥", "가성비", "해장"],
      comment: "혼자 먹기 편하고 회전이 빨라 부담 없음",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: createId("place"),
      projectId,
      memberId: memberByName["존슨"],
      name: "광안리 술집",
      naverMapUrl:
        "https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC%20%EC%88%A0%EC%A7%91",
      address: "부산 수영구 광안동",
      lat: 35.1532,
      lng: 129.1186,
      category: "술집",
      tags: ["분위기", "야경", "2차"],
      comment: "바다 보고 가볍게 한잔하기 좋음",
      createdAt,
      updatedAt: createdAt
    },
    {
      id: createId("place"),
      projectId,
      memberId: memberByName["베일"],
      name: "해운대 디저트샵",
      naverMapUrl:
        "https://map.naver.com/p/search/%ED%95%B4%EC%9A%B4%EB%8C%80%20%EB%94%94%EC%A0%80%ED%8A%B8%EC%83%B5",
      address: "부산 해운대구 우동",
      lat: 35.1632,
      lng: 129.1636,
      category: "디저트",
      tags: ["선물", "사진", "달달함"],
      comment: "여행 기분 내기 좋은 디저트가 많음",
      createdAt,
      updatedAt: createdAt
    }
  ];

  saveStore({
    projects: [project, ...store.projects],
    members: [...store.members, ...members],
    places: [...places, ...store.places]
  });

  return project;
}
