import { describe, expect, it } from "vitest";
import {
  EMPTY_CONDITIONS,
  type DiscoverConditions,
  hasSearchableConditions,
  matchesConditions,
  parseDiscoverConditions,
  serializeDiscoverConditions,
} from "../discover";

describe("쿼리스트링 왕복", () => {
  it("설정한 조건이 그대로 되돌아온다", () => {
    const conditions: DiscoverConditions = {
      lawdCodes: ["11650", "11680"],
      minPriceManwon: 50000,
      maxPriceManwon: 100000,
      minAreaM2: 59,
      maxAreaM2: 85,
      builtAfter: 2010,
      recentMonths: 6,
      sort: "pricePerPyeong",
    };
    expect(parseDiscoverConditions(serializeDiscoverConditions(conditions))).toEqual(conditions);
  });

  it("기본값은 URL 에 넣지 않는다", () => {
    expect(serializeDiscoverConditions(EMPTY_CONDITIONS).toString()).toBe("");
  });

  it("빈 쿼리스트링은 기본 조건이 된다", () => {
    expect(parseDiscoverConditions(new URLSearchParams())).toEqual(EMPTY_CONDITIONS);
  });

  it("recentMonths 를 명시적으로 비울 수 있다 — 전체 기간", () => {
    const conditions = { ...EMPTY_CONDITIONS, recentMonths: null };
    const params = serializeDiscoverConditions(conditions);
    expect(params.get("months")).toBe("");
    expect(parseDiscoverConditions(params).recentMonths).toBeNull();
  });

  it("잘못된 숫자는 null 로 폴백한다", () => {
    const parsed = parseDiscoverConditions(new URLSearchParams("minPrice=abc"));
    expect(parsed.minPriceManwon).toBeNull();
  });
});

describe("hasSearchableConditions", () => {
  it("지역이 없으면 검색할 수 없다", () => {
    expect(hasSearchableConditions(EMPTY_CONDITIONS)).toBe(false);
  });

  it("지역이 있으면 다른 조건이 없어도 검색 가능하다", () => {
    expect(hasSearchableConditions({ ...EMPTY_CONDITIONS, lawdCodes: ["11650"] })).toBe(true);
  });
});

describe("matchesConditions", () => {
  const candidate = { medianManwon: 80000, areaGroup: 85, buildYear: 2015 };

  it("조건이 없으면 통과한다", () => {
    expect(matchesConditions(candidate, EMPTY_CONDITIONS)).toBe(true);
  });

  it("가격·면적·연식 범위로 거른다", () => {
    expect(matchesConditions(candidate, { ...EMPTY_CONDITIONS, maxPriceManwon: 70000 })).toBe(false);
    expect(matchesConditions(candidate, { ...EMPTY_CONDITIONS, minPriceManwon: 70000 })).toBe(true);
    expect(matchesConditions(candidate, { ...EMPTY_CONDITIONS, minAreaM2: 90 })).toBe(false);
    expect(matchesConditions(candidate, { ...EMPTY_CONDITIONS, builtAfter: 2020 })).toBe(false);
    expect(matchesConditions(candidate, { ...EMPTY_CONDITIONS, builtAfter: 2010 })).toBe(true);
  });

  it("준공년도를 모르는 후보는 연식 조건에서 걸러내지 않는다", () => {
    const unknown = { ...candidate, buildYear: null };
    expect(matchesConditions(unknown, { ...EMPTY_CONDITIONS, builtAfter: 2020 })).toBe(true);
  });
});
