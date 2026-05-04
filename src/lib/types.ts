export const PLACE_CATEGORIES = [
  "밥집",
  "카페",
  "술집",
  "디저트",
  "놀거리",
  "기타"
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type MemberRole = "owner" | "editor" | "viewer";

export type Project = {
  id: string;
  name: string;
  description: string;
  /** Supabase 사용 시에만 존재. 초대 링크 코드 */
  inviteCode: string | null;
  createdAt: string;
};

export type Member = {
  id: string;
  projectId: string;
  /** Supabase Auth user.id. 로컬스토리지 모드에서는 null */
  userId: string | null;
  nickname: string;
  markerColor: string;
  role: MemberRole;
  createdAt: string;
};

export type Place = {
  id: string;
  projectId: string;
  memberId: string;
  name: string;
  naverMapUrl: string;
  address: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  tags: string[];
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCreateInput = Pick<Project, "name" | "description">;

export type MemberCreateInput = Pick<
  Member,
  "nickname" | "markerColor" | "role"
>;

export type PlaceCreateInput = Pick<
  Place,
  | "memberId"
  | "name"
  | "naverMapUrl"
  | "address"
  | "lat"
  | "lng"
  | "category"
  | "tags"
  | "comment"
>;

export type FilterState = {
  memberId: string;
  category: "전체" | PlaceCategory;
  tag: string;
};

export type PickedLocation = {
  lat: number;
  lng: number;
  address: string;
  naverMapUrl: string;
  name?: string;
  category?: PlaceCategory;
  tags?: string[];
  comment?: string;
};

export type ProjectCounts = {
  memberCount: number;
  placeCount: number;
  myRole?: MemberRole | null;
};

export type NaverLocalSearchItem = {
  title: string;
  link: string;
  category: string;
  description: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  naverMapUrl: string;
};
