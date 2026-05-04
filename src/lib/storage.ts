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

