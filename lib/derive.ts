/**
 * 매물에서 뽑아내는 파생값들.
 *
 * 순수 함수만 둔다 — 서버 전용 코드(Prisma)와 섞지 않아야 테스트할 수 있고,
 * 클라이언트 컴포넌트에서도 그대로 쓸 수 있다.
 */
import type { SortKey } from "@/lib/filters";
import type { ScoreResult } from "@/lib/scoring";

export interface PriceChange {
  deltaManwon: number;
  previousManwon: number;
  changedAt: Date;
}

/**
 * 가장 최근 호가 변동.
 * "3주째 안 팔리고 5천 내렸다"는 협상에서 실제로 쓰이는 정보다.
 */
export function latestPriceChange(
  history: { priceManwon: number | null; recordedAt: Date }[],
): PriceChange | null {
  const priced = history.filter((h) => h.priceManwon !== null);
  if (priced.length < 2) return null;

  const [current, previous] = priced;
  const delta = (current.priceManwon ?? 0) - (previous.priceManwon ?? 0);
  if (delta === 0) return null;

  return {
    deltaManwon: delta,
    previousManwon: previous.priceManwon ?? 0,
    changedAt: current.recordedAt,
  };
}

/**
 * 최근 N일 안에 호가가 바뀐 매물.
 *
 * 시각을 인자로 받는다. 컴포넌트 안에서 Date.now() 를 부르면 렌더가 순수하지 않게 되고,
 * 테스트도 실행 시각에 따라 흔들린다.
 */
export function filterRecentPriceChanges<T extends { priceChange: PriceChange | null }>(
  listings: T[],
  days = 7,
  now: number = Date.now(),
): T[] {
  const cutoff = now - days * 24 * 3600 * 1000;
  return listings
    .filter((listing) => listing.priceChange && listing.priceChange.changedAt.getTime() >= cutoff)
    .sort(
      (a, b) =>
        (b.priceChange?.changedAt.getTime() ?? 0) - (a.priceChange?.changedAt.getTime() ?? 0),
    );
}

interface Sortable {
  createdAt: Date;
  priceManwon: number | null;
  pricePerPyeongManwon: number | null;
  scoreSortKey: number;
  priceChange: PriceChange | null;
  score: ScoreResult;
}

/**
 * 값이 없는 매물은 방향과 무관하게 항상 뒤로 보낸다.
 * 빈 칸이 1등으로 올라오면 정렬이 쓸모없어진다.
 */
export function sortListings<T extends Sortable>(listings: T[], sort: SortKey, desc: boolean): T[] {
  const direction = desc ? -1 : 1;

  const value = (listing: T): number | null => {
    switch (sort) {
      case "price":
        return listing.priceManwon;
      case "pricePerPyeong":
        return listing.pricePerPyeongManwon;
      case "score":
        return listing.score.score === null ? null : listing.scoreSortKey;
      case "recentChange":
        return listing.priceChange ? listing.priceChange.changedAt.getTime() : null;
      default:
        return listing.createdAt.getTime();
    }
  };

  return [...listings].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return (av - bv) * direction;
  });
}
