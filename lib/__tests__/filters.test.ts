import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  type FilterableListing,
  type ListingFilters,
  hasActiveFilters,
  matchesFilters,
  parseFilters,
  serializeFilters,
} from "../filters";

const base: FilterableListing = {
  nickname: "반포 25평 A",
  address: "서울 서초구 반포동",
  complexName: "래미안퍼스티지",
  memo: "남향 로열층",
  status: "관심",
  dealType: "매매",
  propertyType: "아파트",
  priceManwon: 250000,
  areaM2: 84.96,
  builtYear: 2009,
  commuteMinutes: 35,
  tags: "역세권,학군",
};

describe("쿼리스트링 왕복", () => {
  it("설정한 필터가 그대로 되돌아온다", () => {
    const filters: ListingFilters = {
      ...EMPTY_FILTERS,
      status: ["관심", "임장예정"],
      dealType: ["매매"],
      q: "반포",
      minPrice: 100000,
      maxPrice: 300000,
      minArea: 59,
      builtAfter: 2000,
      maxCommute: 40,
      tags: ["역세권"],
      hideDealBreakers: true,
      sort: "pricePerPyeong",
      desc: false,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it("기본값은 URL에 넣지 않는다 — 주소가 짧아야 공유한다", () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe("");
  });

  it("빈 쿼리스트링은 기본 필터가 된다", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("망가진 값을 기본값으로 되돌린다", () => {
    const parsed = parseFilters(new URLSearchParams("sort=없는정렬&minPrice=abc"));
    expect(parsed.sort).toBe("createdAt");
    expect(parsed.minPrice).toBeNull();
  });

  it("정렬만 바꾼 것은 필터가 걸린 것으로 치지 않는다", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, sort: "price" })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "반포" })).toBe(true);
  });
});

describe("matchesFilters", () => {
  it("조건이 없으면 전부 통과한다", () => {
    expect(matchesFilters(base, EMPTY_FILTERS)).toBe(true);
  });

  it("상태·거래유형으로 거른다", () => {
    expect(matchesFilters(base, { ...EMPTY_FILTERS, status: ["보류"] })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, status: ["관심"] })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, dealType: ["전세"] })).toBe(false);
  });

  it("검색어는 별칭·주소·단지명·메모를 훑는다", () => {
    expect(matchesFilters(base, { ...EMPTY_FILTERS, q: "래미안" })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, q: "로열층" })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, q: "잠실" })).toBe(false);
  });

  it("가격·면적·연식·통근 범위로 거른다", () => {
    expect(matchesFilters(base, { ...EMPTY_FILTERS, maxPrice: 200000 })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, minPrice: 200000 })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, minArea: 100 })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, builtAfter: 2015 })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, maxCommute: 30 })).toBe(false);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, maxCommute: 40 })).toBe(true);
  });

  // 부분 입력이 기본값이라는 설계를 지키는 테스트
  it("아직 안 채운 필드 때문에 매물이 사라지지 않는다", () => {
    const bare: FilterableListing = {
      nickname: "이름만 적어둔 집",
      status: "관심",
      dealType: "매매",
      propertyType: "아파트",
      tags: "",
    };
    const tight: ListingFilters = {
      ...EMPTY_FILTERS,
      minPrice: 100000,
      maxPrice: 200000,
      minArea: 59,
      builtAfter: 2010,
      maxCommute: 30,
    };
    expect(matchesFilters(bare, tight)).toBe(true);
  });

  it("태그는 전부 만족해야 한다", () => {
    expect(matchesFilters(base, { ...EMPTY_FILTERS, tags: ["역세권"] })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, tags: ["역세권", "학군"] })).toBe(true);
    expect(matchesFilters(base, { ...EMPTY_FILTERS, tags: ["역세권", "신축"] })).toBe(false);
  });
});
