/**
 * "조건에 맞는 단지 찾기"의 서버 데이터 접근.
 *
 * DB 로 넓게 좁힌 뒤(지역·기간·연식) 나머지 집계·필터는 lib/complexes.ts,
 * lib/discover.ts 의 순수 함수로 한다. 개인용 규모(좁힌 뒤 수천 행)에서는
 * 이 단순함이 SQL 집계보다 낫다 — 중앙값은 SQL 로 짜기 번거롭고
 * 순수 함수로 두면 테스트할 수 있다.
 */
import "server-only";
import { aggregateComplexes, sortCandidates } from "@/lib/complexes";
import { prisma } from "@/lib/db";
import { type DiscoverConditions, matchesConditions } from "@/lib/discover";

export async function findComplexCandidates(conditions: DiscoverConditions) {
  if (conditions.lawdCodes.length === 0) return [];

  const cutoff =
    conditions.recentMonths !== null
      ? new Date(new Date().setMonth(new Date().getMonth() - conditions.recentMonths))
      : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      lawdCd: { in: conditions.lawdCodes },
      canceled: false,
      ...(conditions.builtAfter !== null
        ? { OR: [{ buildYear: { gte: conditions.builtAfter } }, { buildYear: null }] }
        : {}),
      ...(cutoff ? { dealDate: { gte: cutoff } } : {}),
    },
  });

  const candidates = aggregateComplexes(transactions).filter((c) => matchesConditions(c, conditions));
  return sortCandidates(candidates, conditions.sort);
}

export async function getRegionSyncStatus(lawdCodes: string[]) {
  if (lawdCodes.length === 0) return [];
  return prisma.regionSync.findMany({
    where: { lawdCd: { in: lawdCodes } },
    orderBy: { syncedAt: "desc" },
  });
}
