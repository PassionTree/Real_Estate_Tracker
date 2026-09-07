/**
 * "조건에 맞는 단지 찾기" — 검색 조건과 URL 직렬화.
 *
 * lib/filters.ts 와 같은 패턴을 그대로 따른다: 조건을 URL 쿼리에 담아
 * "이 조건으로 찾은 것 봐봐" 하고 링크 하나로 공유할 수 있게 한다.
 */

export interface DiscoverConditions {
  lawdCodes: string[];
  minPriceManwon: number | null;
  maxPriceManwon: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
  builtAfter: number | null;
  /** 이 개월 수 안의 거래만 본다. null 이면 캐시에 있는 전체 기간 */
  recentMonths: number | null;
  sort: DiscoverSortKey;
}

export const EMPTY_CONDITIONS: DiscoverConditions = {
  lawdCodes: [],
  minPriceManwon: null,
  maxPriceManwon: null,
  minAreaM2: null,
  maxAreaM2: null,
  builtAfter: null,
  recentMonths: 12,
  sort: "recent",
};

export const DISCOVER_SORT_KEYS = ["median", "pricePerPyeong", "dealCount", "recent"] as const;
export type DiscoverSortKey = (typeof DISCOVER_SORT_KEYS)[number];

export const DISCOVER_SORT_LABELS: Record<DiscoverSortKey, string> = {
  median: "실거래 중앙값순",
  pricePerPyeong: "평당가순",
  dealCount: "거래건수순",
  recent: "최근 거래순",
};

function num(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseDiscoverConditions(params: URLSearchParams): DiscoverConditions {
  const lawdCodes = (params.get("lawd") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const sortRaw = params.get("sort");
  const sort = (DISCOVER_SORT_KEYS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as DiscoverSortKey)
    : EMPTY_CONDITIONS.sort;

  return {
    lawdCodes,
    minPriceManwon: num(params.get("minPrice")),
    maxPriceManwon: num(params.get("maxPrice")),
    minAreaM2: num(params.get("minArea")),
    maxAreaM2: num(params.get("maxArea")),
    builtAfter: num(params.get("builtAfter")),
    recentMonths: params.has("months") ? num(params.get("months")) : EMPTY_CONDITIONS.recentMonths,
    sort,
  };
}

/** 기본값과 같은 항목은 URL 에 넣지 않는다 — 주소가 짧아야 공유할 마음이 든다. */
export function serializeDiscoverConditions(conditions: DiscoverConditions): URLSearchParams {
  const params = new URLSearchParams();

  if (conditions.lawdCodes.length > 0) params.set("lawd", conditions.lawdCodes.join(","));

  const putNum = (key: string, value: number | null) => {
    if (value !== null) params.set(key, String(value));
  };
  putNum("minPrice", conditions.minPriceManwon);
  putNum("maxPrice", conditions.maxPriceManwon);
  putNum("minArea", conditions.minAreaM2);
  putNum("maxArea", conditions.maxAreaM2);
  putNum("builtAfter", conditions.builtAfter);

  if (conditions.recentMonths !== EMPTY_CONDITIONS.recentMonths) {
    params.set("months", conditions.recentMonths === null ? "" : String(conditions.recentMonths));
  }

  if (conditions.sort !== EMPTY_CONDITIONS.sort) params.set("sort", conditions.sort);

  return params;
}

export function hasSearchableConditions(conditions: DiscoverConditions): boolean {
  return conditions.lawdCodes.length > 0;
}

interface CandidateLike {
  medianManwon: number;
  areaGroup: number;
  buildYear: number | null;
}

/**
 * 집계된 후보에 조건을 적용한다.
 * 값이 없는 항목(예: 준공년도 미상)은 그 조건에서 걸러내지 않는다 —
 * 데이터가 없다고 후보에서 사라지면 판단할 기회 자체가 없어진다.
 */
export function matchesConditions(candidate: CandidateLike, conditions: DiscoverConditions): boolean {
  const { minPriceManwon, maxPriceManwon, minAreaM2, maxAreaM2, builtAfter } = conditions;

  if (minPriceManwon !== null && candidate.medianManwon < minPriceManwon) return false;
  if (maxPriceManwon !== null && candidate.medianManwon > maxPriceManwon) return false;
  if (minAreaM2 !== null && candidate.areaGroup < minAreaM2) return false;
  if (maxAreaM2 !== null && candidate.areaGroup > maxAreaM2) return false;
  if (builtAfter !== null && candidate.buildYear !== null && candidate.buildYear < builtAfter) return false;

  return true;
}
