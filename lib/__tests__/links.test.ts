import { describe, expect, it } from "vitest";
import { complexSearchLinks, listingDeepLinks } from "../links";

describe("complexSearchLinks", () => {
  it("이름으로 4개 서비스 검색 링크를 낸다", () => {
    const links = complexSearchLinks("래미안퍼스티지");
    expect(links.map((l) => l.label)).toEqual(["호갱노노", "네이버지도", "네이버부동산", "아실"]);
  });

  it("URL 에 검색어를 인코딩해 넣는다", () => {
    const links = complexSearchLinks("래미안 퍼스티지");
    expect(links[0].url).toBe("https://hogangnono.com/search/%EB%9E%98%EB%AF%B8%EC%95%88%20%ED%8D%BC%EC%8A%A4%ED%8B%B0%EC%A7%80");
  });

  it("빈 문자열이면 링크를 내지 않는다", () => {
    expect(complexSearchLinks("")).toEqual([]);
    expect(complexSearchLinks("   ")).toEqual([]);
  });
});

describe("listingDeepLinks — 리팩터링 후에도 기존 동작이 같다", () => {
  it("단지명이 있으면 단지 검색 링크 + 등기소를 낸다", () => {
    const links = listingDeepLinks({ complexName: "래미안퍼스티지", address: null, priceManwon: null });
    expect(links.map((l) => l.label)).toEqual(["호갱노노", "네이버지도", "네이버부동산", "아실", "인터넷등기소"]);
  });

  it("단지명이 없으면 주소로 대신한다", () => {
    const links = listingDeepLinks({ complexName: null, address: "서울 서초구 반포동", priceManwon: null });
    expect(links[0].url).toBe(complexSearchLinks("서울 서초구 반포동")[0].url);
  });

  it("단지명도 주소도 없으면 등기소 링크만 남는다", () => {
    const links = listingDeepLinks({ complexName: null, address: null, priceManwon: null });
    expect(links).toEqual([
      { label: "인터넷등기소", url: "https://www.iros.go.kr/", description: "등기부등본 열람 — 근저당·가압류 확인 (700원)" },
    ]);
  });

  it("가격이 있으면 부동산계산기 링크가 마지막에 붙는다", () => {
    const links = listingDeepLinks({ complexName: "래미안퍼스티지", address: null, priceManwon: 100000 });
    expect(links.at(-1)?.label).toBe("부동산계산기");
  });

  it("가격이 없으면 부동산계산기 링크가 없다", () => {
    const links = listingDeepLinks({ complexName: "래미안퍼스티지", address: null, priceManwon: null });
    expect(links.some((l) => l.label === "부동산계산기")).toBe(false);
  });
});
