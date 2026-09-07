/**
 * 목록 필터 ↔ 쿼리스트링 변환.
 *
 * 필터 상태를 URL 에 담아두면 "이 조건으로 걸러낸 집들 봐봐" 하고
 * 배우자에게 링크 하나로 넘길 수 있다. 부부가 같이 쓰는 앱에서 이게 꽤 중요하다.
 */

export const STATUSES = ["관심", "임장예정", "임장완료", "보류", "제외", "계약"] as const;
export const DEAL_TYPES = ["매매", "전세", "월세"] as const;
export const PROPERTY_TYPES = ["아파트", "오피스텔", "빌라", "단독"] as const;

export const SORT_KEYS = [
  "createdAt",
  "price",
  "pricePerPyeong",
  "score",
  "recentChange",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  createdAt: "등록순",
  price: "가격순",
  pricePerPyeong: "평당가순",
  score: "종합점수순",
  recentChange: "최근 변동순",
};

export interface ListingFilters {
  status: string[];
  dealType: string[];
  propertyType: string[];
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  builtAfter: number | null;
  maxCommute: number | null;
  tags: string[];
  hideDealBreakers: boolean;
  sort: SortKey;
  desc: boolean;
}

export const EMPTY_FILTERS: ListingFilters = {
  status: [],
  dealType: [],
  propertyType: [],
  q: "",
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  builtAfter: null,
  maxCommute: null,
  tags: [],
  hideDealBreakers: false,
  sort: "createdAt",
  desc: true,
};

function num(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function list(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseFilters(params: URLSearchParams): ListingFilters {
  const sortRaw = params.get("sort");
  const sort = (SORT_KEYS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortKey)
    : EMPTY_FILTERS.sort;

  return {
    status: list(params.get("status")),
    dealType: list(params.get("dealType")),
    propertyType: list(params.get("propertyType")),
    q: params.get("q") ?? "",
    minPrice: num(params.get("minPrice")),
    maxPrice: num(params.get("maxPrice")),
    minArea: num(params.get("minArea")),
    maxArea: num(params.get("maxArea")),
    builtAfter: num(params.get("builtAfter")),
    maxCommute: num(params.get("maxCommute")),
    tags: list(params.get("tags")),
    hideDealBreakers: params.get("hideDealBreakers") === "1",
    sort,
    // desc 는 명시적으로 0 일 때만 오름차순
    desc: params.get("desc") !== "0",
  };
}

/** 기본값과 같은 항목은 URL 에 넣지 않는다 — 주소가 짧아야 공유할 마음이 든다. */
export function serializeFilters(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();

  const putList = (key: keyof ListingFilters, value: string[]) => {
    if (value.length > 0) params.set(key, value.join(","));
  };
  const putNum = (key: keyof ListingFilters, value: number | null) => {
    if (value !== null) params.set(key, String(value));
  };

  putList("status", filters.status);
  putList("dealType", filters.dealType);
  putList("propertyType", filters.propertyType);
  putList("tags", filters.tags);
  if (filters.q.trim() !== "") params.set("q", filters.q.trim());
  putNum("minPrice", filters.minPrice);
  putNum("maxPrice", filters.maxPrice);
  putNum("minArea", filters.minArea);
  putNum("maxArea", filters.maxArea);
  putNum("builtAfter", filters.builtAfter);
  putNum("maxCommute", filters.maxCommute);
  if (filters.hideDealBreakers) params.set("hideDealBreakers", "1");
  if (filters.sort !== EMPTY_FILTERS.sort) params.set("sort", filters.sort);
  if (!filters.desc) params.set("desc", "0");

  return params;
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  const params = serializeFilters(filters);
  params.delete("sort");
  params.delete("desc");
  return Array.from(params.keys()).length > 0;
}

/** 클라이언트에서 거르는 조건. 목록이 수백 건을 넘지 않는 개인용이라 메모리에서 처리한다. */
export interface FilterableListing {
  nickname: string;
  address?: string | null;
  complexName?: string | null;
  memo?: string | null;
  status: string;
  dealType: string;
  propertyType: string;
  priceManwon?: number | null;
  areaM2?: number | null;
  builtYear?: number | null;
  commuteMinutes?: number | null;
  tags: string;
}

export function matchesFilters(listing: FilterableListing, filters: ListingFilters): boolean {
  if (filters.status.length && !filters.status.includes(listing.status)) return false;
  if (filters.dealType.length && !filters.dealType.includes(listing.dealType)) return false;
  if (filters.propertyType.length && !filters.propertyType.includes(listing.propertyType)) return false;

  if (filters.q.trim()) {
    const needle = filters.q.trim().toLowerCase();
    const haystack = [listing.nickname, listing.address, listing.complexName, listing.memo]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  // 값이 없는 매물은 숫자 조건에서 걸러내지 않는다.
  // 아직 안 채운 필드 때문에 매물이 사라지면 부분 입력을 못 쓴다.
  const price = listing.priceManwon;
  if (filters.minPrice !== null && price != null && price < filters.minPrice) return false;
  if (filters.maxPrice !== null && price != null && price > filters.maxPrice) return false;

  const area = listing.areaM2;
  if (filters.minArea !== null && area != null && area < filters.minArea) return false;
  if (filters.maxArea !== null && area != null && area > filters.maxArea) return false;

  if (filters.builtAfter !== null && listing.builtYear != null && listing.builtYear < filters.builtAfter) {
    return false;
  }

  if (
    filters.maxCommute !== null &&
    listing.commuteMinutes != null &&
    listing.commuteMinutes > filters.maxCommute
  ) {
    return false;
  }

  if (filters.tags.length) {
    const own = listing.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (!filters.tags.every((t) => own.includes(t))) return false;
  }

  return true;
}
