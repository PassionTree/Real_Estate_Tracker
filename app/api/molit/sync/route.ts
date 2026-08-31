import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MolitApiError, fetchTransactions } from "@/lib/molit";

/** YYYY-MM 형식의 최근 N개월 목록(YYYYMM). 이번 달부터 거꾸로 센다. */
function recentYearMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/**
 * 실거래가 수집.
 *
 * 화면을 열 때마다 API 를 부르지 않는다 — 명시적으로 이 라우트를 호출했을 때만,
 * 사용자가 고른 (지역 × 최근 개월수) 조합을 순차로 수집해 Transaction 에 채운다.
 *
 * 재수집은 해당 (지역, 년월)의 기존 행을 지우고 새로 넣는 방식이다.
 * 실거래가는 신고 지연·정정이 있어 최근 달은 다시 받는 편이 맞고,
 * 자연 키(같은 날 같은 평형 같은 금액이 실제 다른 거래일 수 있다)를 만들기 어렵기 때문이다.
 */
export async function POST(request: NextRequest) {
  if (!process.env.MOLIT_API_KEY) {
    return NextResponse.json(
      { error: "MOLIT_API_KEY 가 설정되지 않았습니다. .env 에 키를 넣고 서버를 다시 시작하세요." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const lawdCodes: string[] = Array.isArray(body?.lawdCodes) ? body.lawdCodes : [];
  const months: number = Number.isFinite(body?.months) ? body.months : 12;

  if (lawdCodes.length === 0) {
    return NextResponse.json({ error: "수집할 지역을 하나 이상 고르세요." }, { status: 400 });
  }

  const dealYmds = recentYearMonths(Math.min(Math.max(months, 1), 24));
  const results: { lawdCd: string; dealYmd: string; rowCount: number; error?: string }[] = [];

  for (const lawdCd of lawdCodes) {
    for (const dealYmd of dealYmds) {
      try {
        const { transactions } = await fetchTransactions(lawdCd, dealYmd);

        await prisma.$transaction([
          prisma.transaction.deleteMany({ where: { lawdCd, dealYmd } }),
          prisma.transaction.createMany({
            data: transactions.map((t) => ({
              aptSeq: t.aptSeq,
              aptNm: t.aptNm,
              lawdCd: t.lawdCd,
              umdNm: t.umdNm,
              jibun: t.jibun,
              roadNm: t.roadNm,
              buildYear: t.buildYear,
              excluUseAr: t.excluUseAr,
              areaGroup: Math.round(t.excluUseAr),
              floor: t.floor,
              dealAmountManwon: t.dealAmountManwon,
              dealDate: t.dealDate,
              dealYmd,
              canceled: t.canceled,
            })),
          }),
          prisma.regionSync.upsert({
            where: { lawdCd_dealYmd: { lawdCd, dealYmd } },
            create: { lawdCd, dealYmd, rowCount: transactions.length },
            update: { rowCount: transactions.length, syncedAt: new Date() },
          }),
        ]);

        results.push({ lawdCd, dealYmd, rowCount: transactions.length });
      } catch (error) {
        // 한 (지역×월) 이 실패해도 나머지는 계속 수집한다.
        const message = error instanceof MolitApiError ? error.message : "알 수 없는 오류";
        results.push({ lawdCd, dealYmd, rowCount: 0, error: message });
      }
    }
  }

  const failed = results.filter((r) => r.error);
  return NextResponse.json({ results, succeeded: results.length - failed.length, failed: failed.length });
}
