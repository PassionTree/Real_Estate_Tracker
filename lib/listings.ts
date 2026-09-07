/**
 * 매물 조회.
 *
 * 목록·비교·대시보드가 모두 같은 모양의 데이터를 보게 하려고 여기 모아둔다.
 * 순수한 파생 계산은 lib/derive.ts 에 있다 — 서버 전용 코드와 섞지 않아야 테스트할 수 있다.
 */
import "server-only";
import { monthlyHousingCost, pricePerPyeong } from "@/lib/area";
import { prisma } from "@/lib/db";
import { latestPriceChange } from "@/lib/derive";
import { calculateScore, sortKey } from "@/lib/scoring";

export { filterRecentPriceChanges, sortListings, type PriceChange } from "@/lib/derive";

export type ListingWithRelations = Awaited<ReturnType<typeof getListings>>[number];

export async function getCriteria() {
  return prisma.criterion.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getListings() {
  const [listings, criteria] = await Promise.all([
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        scores: true,
        priceHistory: { orderBy: { recordedAt: "desc" } },
      },
    }),
    getCriteria(),
  ]);

  return listings.map((listing) => decorate(listing, criteria));
}

export async function getListing(id: string) {
  const [listing, criteria] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        scores: true,
        priceHistory: { orderBy: { recordedAt: "desc" } },
      },
    }),
    getCriteria(),
  ]);

  if (!listing) return null;
  return decorate(listing, criteria);
}

/**
 * 파생값을 붙인다.
 *
 * 제네릭으로 받아 원래 타입을 그대로 통과시킨다. 여기서 모양을 손으로 적으면
 * 호출부에서 실제로 조회한 필드(가격 메모, 기록자 등)가 타입에서 사라진다.
 */
function decorate<
  T extends {
    priceManwon: number | null;
    areaM2: number | null;
    monthlyRentManwon: number | null;
    maintenanceManwon: number | null;
    scores: { criterionId: string; value: number }[];
    priceHistory: { priceManwon: number | null; recordedAt: Date }[];
  },
>(listing: T, criteria: Awaited<ReturnType<typeof getCriteria>>) {
  const score = calculateScore(criteria, listing.scores);

  return {
    ...listing,
    score,
    scoreSortKey: sortKey(score),
    pricePerPyeongManwon: pricePerPyeong(listing.priceManwon, listing.areaM2),
    monthlyCostManwon: monthlyHousingCost(listing),
    priceChange: latestPriceChange(listing.priceHistory),
  };
}
