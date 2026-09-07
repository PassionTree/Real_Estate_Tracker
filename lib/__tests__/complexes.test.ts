import { describe, expect, it } from "vitest";
import { type TransactionLike, aggregateComplexes, normalizeComplexName, sortCandidates } from "../complexes";

const at = (dateStr: string) => new Date(dateStr);

function tx(overrides: Partial<TransactionLike> = {}): TransactionLike {
  return {
    aptSeq: "11650-123",
    aptNm: "래미안퍼스티지",
    lawdCd: "11650",
    umdNm: "반포동",
    buildYear: 2009,
    areaGroup: 85,
    dealAmountManwon: 250000,
    dealDate: at("2026-07-01"),
    canceled: false,
    ...overrides,
  };
}

describe("normalizeComplexName", () => {
  it("공백·특수문자를 제거해 같은 단지로 본다", () => {
    expect(normalizeComplexName("래미안 퍼스티지")).toBe(normalizeComplexName("래미안퍼스티지"));
    expect(normalizeComplexName("래미안-퍼스티지(1차)")).toBe(normalizeComplexName("래미안퍼스티지1차"));
  });

  it("대소문자를 구분하지 않는다", () => {
    expect(normalizeComplexName("ABC Apt")).toBe(normalizeComplexName("abc apt"));
  });
});

describe("aggregateComplexes", () => {
  it("같은 단지·같은 평형 거래를 하나의 후보로 묶는다", () => {
    const candidates = aggregateComplexes([
      tx({ dealAmountManwon: 250000 }),
      tx({ dealAmountManwon: 260000 }),
      tx({ dealAmountManwon: 255000 }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].dealCount).toBe(3);
  });

  it("평형이 다르면 같은 단지여도 다른 후보다", () => {
    const candidates = aggregateComplexes([tx({ areaGroup: 59 }), tx({ areaGroup: 85 })]);
    expect(candidates).toHaveLength(2);
  });

  it("중앙값을 쓴다 — 평균이 아니다", () => {
    // 10,20,30,1000 → 평균은 265 로 튄 값에 끌려가지만 중앙값은 25 여야 한다
    const candidates = aggregateComplexes([
      tx({ dealAmountManwon: 10 }),
      tx({ dealAmountManwon: 20 }),
      tx({ dealAmountManwon: 30 }),
      tx({ dealAmountManwon: 1000 }),
    ]);
    expect(candidates[0].medianManwon).toBe(25);
  });

  it("짝수·홀수 개수 모두 중앙값을 정확히 낸다", () => {
    const odd = aggregateComplexes([tx({ dealAmountManwon: 10 }), tx({ dealAmountManwon: 20 }), tx({ dealAmountManwon: 30 })]);
    expect(odd[0].medianManwon).toBe(20);

    const even = aggregateComplexes([tx({ dealAmountManwon: 10 }), tx({ dealAmountManwon: 20 })]);
    expect(even[0].medianManwon).toBe(15);
  });

  it("해제된 거래는 집계에서 뺀다", () => {
    const candidates = aggregateComplexes([
      tx({ dealAmountManwon: 250000 }),
      tx({ dealAmountManwon: 999999, canceled: true }), // 튄 취소 거래
    ]);
    expect(candidates[0].dealCount).toBe(1);
    expect(candidates[0].medianManwon).toBe(250000);
  });

  it("전부 해제된 거래면 후보가 생기지 않는다", () => {
    expect(aggregateComplexes([tx({ canceled: true })])).toEqual([]);
  });

  it("aptSeq 가 없으면 정규화한 단지명으로 묶는다", () => {
    const candidates = aggregateComplexes([
      tx({ aptSeq: null, aptNm: "래미안퍼스티지" }),
      tx({ aptSeq: null, aptNm: "래미안 퍼스티지" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].dealCount).toBe(2);
  });

  it("aptSeq 가 다르면 단지명이 같아도 구분한다 — 표기 우연 일치를 막는다", () => {
    const candidates = aggregateComplexes([
      tx({ aptSeq: "11650-1", aptNm: "래미안" }),
      tx({ aptSeq: "11650-2", aptNm: "래미안" }),
    ]);
    expect(candidates).toHaveLength(2);
  });

  it("최댓값·최솟값을 함께 낸다", () => {
    const candidates = aggregateComplexes([
      tx({ dealAmountManwon: 200000 }),
      tx({ dealAmountManwon: 300000 }),
    ]);
    expect(candidates[0].minManwon).toBe(200000);
    expect(candidates[0].maxManwon).toBe(300000);
  });

  it("가장 최근 거래의 표기를 대표값으로 쓴다", () => {
    const candidates = aggregateComplexes([
      tx({ dealDate: at("2026-01-01"), buildYear: 2008 }), // 오타였다고 가정
      tx({ dealDate: at("2026-07-01"), buildYear: 2009 }), // 최근 것이 맞다고 가정
    ]);
    expect(candidates[0].buildYear).toBe(2009);
    expect(candidates[0].latestDealDate).toEqual(at("2026-07-01"));
  });

  it("거래가 하나뿐인 후보도 만든다 — dealCount 로 신뢰도를 알 수 있다", () => {
    const candidates = aggregateComplexes([tx()]);
    expect(candidates[0].dealCount).toBe(1);
  });

  it("빈 배열이면 빈 배열을 낸다", () => {
    expect(aggregateComplexes([])).toEqual([]);
  });
});

describe("sortCandidates", () => {
  const base = aggregateComplexes([tx()])[0];
  const a = { ...base, key: "a", medianManwon: 50000, areaGroup: 59, dealCount: 2, latestDealDate: at("2026-01-01") };
  const b = { ...base, key: "b", medianManwon: 80000, areaGroup: 85, dealCount: 5, latestDealDate: at("2026-07-01") };

  it("median — 중앙값 내림차순", () => {
    expect(sortCandidates([a, b], "median").map((c) => c.key)).toEqual(["b", "a"]);
  });

  it("dealCount — 거래건수 내림차순", () => {
    expect(sortCandidates([a, b], "dealCount").map((c) => c.key)).toEqual(["b", "a"]);
  });

  it("recent — 최근 거래일 내림차순", () => {
    expect(sortCandidates([a, b], "recent").map((c) => c.key)).toEqual(["b", "a"]);
  });

  it("pricePerPyeong — 평당가 내림차순", () => {
    // a: 5억/17.8평≒2809만, b: 8억/25.7평≒3113만 → b 가 더 비싸다
    expect(sortCandidates([a, b], "pricePerPyeong").map((c) => c.key)).toEqual(["b", "a"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const input = [a, b];
    sortCandidates(input, "median");
    expect(input).toEqual([a, b]);
  });
});
