import { describe, expect, it } from "vitest";
import { type Criterion, calculateScore, sortKey } from "../scoring";

const criteria: Criterion[] = [
  { id: "traffic", name: "교통·통근", weight: 5, isDealBreaker: false },
  { id: "price", name: "가격 적정성", weight: 5, isDealBreaker: false },
  { id: "layout", name: "평면·구조", weight: 4, isDealBreaker: false },
  { id: "age", name: "연식·관리상태", weight: 3, isDealBreaker: false },
  { id: "around", name: "주변환경", weight: 3, isDealBreaker: false },
  { id: "light", name: "채광·향·조망", weight: 2, isDealBreaker: false },
];

describe("calculateScore", () => {
  it("전부 최고점이면 100점", () => {
    const scores = criteria.map((c) => ({ criterionId: c.id, value: 5 }));
    const result = calculateScore(criteria, scores);
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(1);
  });

  it("전부 최저점이면 0점", () => {
    const scores = criteria.map((c) => ({ criterionId: c.id, value: 1 }));
    expect(calculateScore(criteria, scores).score).toBe(0);
  });

  it("가중치를 반영한다", () => {
    // 가중치 5인 교통만 5점, 가중치 2인 채광만 1점
    const result = calculateScore(criteria, [
      { criterionId: "traffic", value: 5 },
      { criterionId: "light", value: 1 },
    ]);
    // raw = (5*5 + 2*1) / (5+2) = 27/7 ≒ 3.857 → ((3.857-1)/4)*100 ≒ 71.4
    expect(result.score).toBeCloseTo(71.4, 1);
  });

  // ── 이 파일에서 가장 중요한 테스트 ──
  it("미평가 항목을 0점이 아니라 계산에서 제외한다", () => {
    const partial = calculateScore(criteria, [
      { criterionId: "traffic", value: 4 },
      { criterionId: "price", value: 4 },
    ]);
    const full = calculateScore(criteria, criteria.map((c) => ({ criterionId: c.id, value: 4 })));

    // 2개만 평가했어도 전부 4점 준 매물과 같은 점수여야 한다.
    // 0점 처리했다면 partial 이 한참 낮게 나온다.
    expect(partial.score).toBeCloseTo(full.score!, 10);
    expect(partial.score).toBe(75);
  });

  it("평가 비율을 함께 낸다", () => {
    const result = calculateScore(criteria, [
      { criterionId: "traffic", value: 4 }, // weight 5
      { criterionId: "price", value: 4 }, // weight 5
    ]);
    expect(result.evaluatedCount).toBe(2);
    expect(result.totalCount).toBe(6);
    expect(result.coverage).toBeCloseTo(10 / 22, 6);
  });

  it("하나도 평가하지 않으면 0점이 아니라 null", () => {
    const result = calculateScore(criteria, []);
    expect(result.score).toBeNull();
    expect(result.evaluatedCount).toBe(0);
    expect(result.coverage).toBe(0);
  });

  it("알 수 없는 항목의 점수는 무시한다", () => {
    const result = calculateScore(criteria, [{ criterionId: "없는항목", value: 5 }]);
    expect(result.score).toBeNull();
  });

  it("가중치가 전부 0이어도 0으로 나누지 않는다", () => {
    const zeroed = criteria.map((c) => ({ ...c, weight: 0 }));
    const result = calculateScore(zeroed, zeroed.map((c) => ({ criterionId: c.id, value: 5 })));
    expect(result.score).toBeNull();
    expect(Number.isNaN(result.coverage)).toBe(false);
  });

  it("음수 가중치를 0으로 막는다", () => {
    const result = calculateScore(
      [{ id: "a", name: "a", weight: -5, isDealBreaker: false }],
      [{ criterionId: "a", value: 5 }],
    );
    expect(result.score).toBeNull();
  });
});

describe("절대조건", () => {
  const withDealBreaker: Criterion[] = [
    { id: "pets", name: "반려동물 가능", weight: 5, isDealBreaker: true },
    { id: "traffic", name: "교통·통근", weight: 5, isDealBreaker: false },
  ];

  it("2점 이하를 위반으로 잡는다", () => {
    const result = calculateScore(withDealBreaker, [
      { criterionId: "pets", value: 1 },
      { criterionId: "traffic", value: 5 },
    ]);
    expect(result.dealBreakerViolations).toEqual(["반려동물 가능"]);
  });

  it("3점 이상은 위반이 아니다", () => {
    const result = calculateScore(withDealBreaker, [{ criterionId: "pets", value: 3 }]);
    expect(result.dealBreakerViolations).toEqual([]);
  });

  it("위반해도 점수는 계산한다 — 목록에서 지우지 않기 때문", () => {
    const result = calculateScore(withDealBreaker, [
      { criterionId: "pets", value: 1 },
      { criterionId: "traffic", value: 5 },
    ]);
    expect(result.score).not.toBeNull();
  });
});

describe("sortKey", () => {
  it("미평가 < 절대조건 위반 < 일반 점수 순으로 뒤로 보낸다", () => {
    const unrated = sortKey({ score: null, coverage: 0, evaluatedCount: 0, totalCount: 6, dealBreakerViolations: [] });
    const violated = sortKey({ score: 90, coverage: 1, evaluatedCount: 6, totalCount: 6, dealBreakerViolations: ["반려동물"] });
    const normal = sortKey({ score: 0, coverage: 1, evaluatedCount: 6, totalCount: 6, dealBreakerViolations: [] });

    expect(unrated).toBeLessThan(violated);
    expect(violated).toBeLessThan(normal);
  });
});
