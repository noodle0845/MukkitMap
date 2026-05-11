import type {
  Member,
  MemberCreateInput,
  Place,
  PlaceCreateInput,
  PlaceReaction,
  PlaceReactionType,
  PlaceReview,
  PlaceSocialData,
  PlaceVisit,
  Project,
  ProjectCreateInput
} from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

const STORAGE_KEY = "mukkit-map-store-v1";

export type MukkitStore = {
  projects: Project[];
  members: Member[];
  places: Place[];
  placeReactions: PlaceReaction[];
  placeVisits: PlaceVisit[];
  placeReviews: PlaceReview[];
};

const EMPTY_STORE: MukkitStore = {
  projects: [],
  members: [],
  places: [],
  placeReactions: [],
  placeVisits: [],
  placeReviews: []
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
    places: Array.isArray(draft.places) ? draft.places : [],
    placeReactions: Array.isArray(draft.placeReactions) ? draft.placeReactions : [],
    placeVisits: Array.isArray(draft.placeVisits) ? draft.placeVisits : [],
    placeReviews: Array.isArray(draft.placeReviews) ? draft.placeReviews : []
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

function removeSocialRows(store: MukkitStore, placeIds: Set<string>) {
  return {
    ...store,
    placeReactions: store.placeReactions.filter((item) => !placeIds.has(item.placeId)),
    placeVisits: store.placeVisits.filter((item) => !placeIds.has(item.placeId)),
    placeReviews: store.placeReviews.filter((item) => !placeIds.has(item.placeId))
  };
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
  const placeIds = new Set(
    store.places.filter((place) => place.projectId === projectId).map((place) => place.id)
  );
  const nextStore = removeSocialRows(store, placeIds);

  saveStore({
    ...nextStore,
    projects: nextStore.projects.filter((project) => project.id !== projectId),
    members: nextStore.members.filter((member) => member.projectId !== projectId),
    places: nextStore.places.filter((place) => place.projectId !== projectId)
  });
}

export function updateProject(projectId: string, input: ProjectCreateInput) {
  const store = getStore();
  let updatedProject: Project | null = null;

  const projects = store.projects.map((project) => {
    if (project.id !== projectId) return project;

    updatedProject = {
      ...project,
      name: input.name.trim(),
      description: input.description.trim()
    };
    return updatedProject;
  });

  saveStore({ ...store, projects });
  return updatedProject;
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
  const placeIds = new Set(
    store.places.filter((place) => place.memberId === memberId).map((place) => place.id)
  );
  const nextStore = removeSocialRows(store, placeIds);

  saveStore({
    ...nextStore,
    members: nextStore.members.filter((member) => member.id !== memberId),
    places: nextStore.places.filter((place) => place.memberId !== memberId)
  });
}

export function updateMember(memberId: string, input: MemberCreateInput) {
  const store = getStore();
  let updatedMember: Member | null = null;

  const members = store.members.map((member) => {
    if (member.id !== memberId) return member;

    updatedMember = {
      ...member,
      nickname: input.nickname.trim(),
      markerColor: input.markerColor,
      role: input.role
    };
    return updatedMember;
  });

  saveStore({ ...store, members });
  return updatedMember;
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
  const nextStore = removeSocialRows(store, new Set([placeId]));

  saveStore({
    ...nextStore,
    places: nextStore.places.filter((place) => place.id !== placeId)
  });
}

export function getPlaceSocialData(projectId: string): PlaceSocialData {
  const store = getStore();
  const placeIds = new Set(
    store.places.filter((place) => place.projectId === projectId).map((place) => place.id)
  );

  return {
    reactions: store.placeReactions.filter((item) => placeIds.has(item.placeId)),
    visits: store.placeVisits.filter((item) => placeIds.has(item.placeId)),
    reviews: store.placeReviews
      .filter((item) => placeIds.has(item.placeId))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  };
}

export function togglePlaceReaction(
  placeId: string,
  reactionType: PlaceReactionType,
  userId = "local-user"
) {
  const store = getStore();
  const existing = store.placeReactions.find(
    (item) =>
      item.placeId === placeId &&
      item.userId === userId &&
      item.reactionType === reactionType
  );

  const placeReactions = existing
    ? store.placeReactions.filter((item) => item.id !== existing.id)
    : [
        ...store.placeReactions,
        {
          id: createId("reaction"),
          placeId,
          userId,
          reactionType,
          createdAt: nowIso()
        }
      ];

  saveStore({ ...store, placeReactions });
}

export function verifyPlaceVisit(
  placeId: string,
  userId = "local-user",
  latitude: number | null = null,
  longitude: number | null = null
) {
  const store = getStore();
  const now = nowIso();
  const existing = store.placeVisits.find(
    (item) => item.placeId === placeId && item.userId === userId
  );

  const visit: PlaceVisit = {
    id: existing?.id ?? createId("visit"),
    placeId,
    userId,
    verified: true,
    verifiedAt: now,
    latitude,
    longitude,
    createdAt: existing?.createdAt ?? now
  };

  const placeVisits = existing
    ? store.placeVisits.map((item) => (item.id === existing.id ? visit : item))
    : [...store.placeVisits, visit];

  saveStore({ ...store, placeVisits });
  return visit;
}

export function createPlaceReview(placeId: string, content: string, userId = "local-user") {
  const store = getStore();
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("리뷰 내용을 입력해주세요.");
  }

  const hasVerifiedVisit = store.placeVisits.some(
    (item) => item.placeId === placeId && item.userId === userId && item.verified
  );

  if (!hasVerifiedVisit) {
    throw new Error("방문 인증 후 리뷰를 남길 수 있어요.");
  }

  const review: PlaceReview = {
    id: createId("review"),
    placeId,
    userId,
    content: trimmed,
    isVerifiedVisit: true,
    createdAt: nowIso()
  };

  saveStore({
    ...store,
    placeReviews: [review, ...store.placeReviews]
  });

  return review;
}
