import { describe, expect, it } from "vitest";
import { filterRecentPriceChanges, latestPriceChange, sortListings } from "../derive";

const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 3600 * 1000);

describe("latestPriceChange", () => {
  it("기록이 하나뿐이면 변동이 없다", () => {
    expect(latestPriceChange([{ priceManwon: 58000, recordedAt: at(0) }])).toBeNull();
  });

  it("직전 기록과의 차이를 낸다", () => {
    const change = latestPriceChange([
      { priceManwon: 53000, recordedAt: at(0) },
      { priceManwon: 58000, recordedAt: at(10) },
    ]);
    expect(change?.deltaManwon).toBe(-5000);
    expect(change?.previousManwon).toBe(58000);
  });

  it("가격이 같으면 변동으로 치지 않는다", () => {
    expect(
      latestPriceChange([
        { priceManwon: 58000, recordedAt: at(0) },
        { priceManwon: 58000, recordedAt: at(5) },
      ]),
    ).toBeNull();
  });

  it("가격이 없는 기록은 건너뛴다", () => {
    const change = latestPriceChange([
      { priceManwon: null, recordedAt: at(0) },
      { priceManwon: 53000, recordedAt: at(1) },
      { priceManwon: 58000, recordedAt: at(10) },
    ]);
    expect(change?.deltaManwon).toBe(-5000);
  });
});

describe("filterRecentPriceChanges", () => {
  const now = Date.now();
  const listing = (daysAgo: number | null) => ({
    priceChange: daysAgo === null ? null : { deltaManwon: -1000, previousManwon: 58000, changedAt: at(daysAgo) },
  });

  it("기간 안의 변동만 남기고 최신순으로 정렬한다", () => {
    const result = filterRecentPriceChanges(
      [listing(10), listing(1), listing(null), listing(5)],
      7,
      now,
    );
    expect(result).toHaveLength(2);
    expect(result[0].priceChange?.changedAt.getTime()).toBeGreaterThan(
      result[1].priceChange!.changedAt.getTime(),
    );
  });

  it("시각을 주입할 수 있어 테스트가 흔들리지 않는다", () => {
    expect(filterRecentPriceChanges([listing(3)], 7, now)).toHaveLength(1);
    expect(filterRecentPriceChanges([listing(3)], 1, now)).toHaveLength(0);
  });
});

describe("sortListings", () => {
  const make = (over: Partial<Parameters<typeof sortListings>[0][number]>) => ({
    createdAt: new Date("2026-01-01"),
    priceManwon: null,
    pricePerPyeongManwon: null,
    scoreSortKey: -2,
    priceChange: null,
    score: { score: null, coverage: 0, evaluatedCount: 0, totalCount: 6, dealBreakerViolations: [] },
    ...over,
  });

  it("가격순으로 정렬한다", () => {
    const rows = [make({ priceManwon: 80000 }), make({ priceManwon: 30000 }), make({ priceManwon: 50000 })];
    expect(sortListings(rows, "price", false).map((r) => r.priceManwon)).toEqual([30000, 50000, 80000]);
    expect(sortListings(rows, "price", true).map((r) => r.priceManwon)).toEqual([80000, 50000, 30000]);
  });

  // 빈 칸이 1등으로 올라오면 정렬이 쓸모없어진다
  it("값이 없는 매물은 방향과 무관하게 항상 뒤로 간다", () => {
    const rows = [make({ priceManwon: null }), make({ priceManwon: 50000 }), make({ priceManwon: 30000 })];
    expect(sortListings(rows, "price", false).at(-1)?.priceManwon).toBeNull();
    expect(sortListings(rows, "price", true).at(-1)?.priceManwon).toBeNull();
  });

  it("미평가 매물은 점수 정렬에서 뒤로 간다", () => {
    const scored = make({
      scoreSortKey: 80,
      score: { score: 80, coverage: 1, evaluatedCount: 6, totalCount: 6, dealBreakerViolations: [] },
    });
    const unrated = make({});
    expect(sortListings([unrated, scored], "score", true)[0]).toBe(scored);
    expect(sortListings([scored, unrated], "score", false)[0]).toBe(scored);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const rows = [make({ priceManwon: 80000 }), make({ priceManwon: 30000 })];
    const before = rows.map((r) => r.priceManwon);
    sortListings(rows, "price", false);
    expect(rows.map((r) => r.priceManwon)).toEqual(before);
  });
});
