import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { matchesFilters, parseFilters } from "@/lib/filters";
import type { NextRequest } from "next/server";

/**
 * 현재 필터가 걸린 결과를 그대로 내보낸다.
 * 엑셀을 계속 쓰고 싶은 사람을 가두지 않는 탈출구이자, 사실상의 백업이다.
 */
export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  const listings = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });

  const csv = toCsv(listings.filter((listing) => matchesFilters(listing, filters)));

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="listings-${stamp}.csv"`,
    },
  });
}
