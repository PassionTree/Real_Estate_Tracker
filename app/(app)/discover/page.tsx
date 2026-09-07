import { Suspense } from "react";
import { ComplexResults, type ComplexResultRow } from "@/components/ComplexResults";
import { DiscoverForm } from "@/components/DiscoverForm";
import { RegionSyncPanel } from "@/components/RegionSyncPanel";
import { Empty, PageHeader } from "@/components/ui";
import { findComplexCandidates, getRegionSyncStatus } from "@/lib/discover-data";
import { hasSearchableConditions, parseDiscoverConditions } from "@/lib/discover";

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const conditions = parseDiscoverConditions(params);

  const hasKey = Boolean(process.env.MOLIT_API_KEY);
  const [candidates, syncStatus] = hasKey
    ? await Promise.all([
        findComplexCandidates(conditions),
        getRegionSyncStatus(conditions.lawdCodes),
      ])
    : [[], []];

  const rows: ComplexResultRow[] = candidates.map((c) => ({
    key: c.key,
    aptNm: c.aptNm,
    umdNm: c.umdNm,
    buildYear: c.buildYear,
    areaGroup: c.areaGroup,
    dealCount: c.dealCount,
    medianManwon: c.medianManwon,
    minManwon: c.minManwon,
    maxManwon: c.maxManwon,
    latestDealDate: c.latestDealDate.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="조건에 맞는 단지 찾기"
        description="국토부 실거래가로 조건에 맞는 단지를 찾아, 호갱노노·네이버부동산 링크를 바로 드립니다."
      />

      <div className="space-y-3 p-4 md:p-6">
        {!hasKey ? (
          <Empty title="MOLIT_API_KEY 가 설정되지 않았습니다">
            <p>
              <a
                href="https://www.data.go.kr/data/15126469/openapi.do"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                공공데이터포털
              </a>
              에서 키를 발급받아 <code className="rounded bg-background px-1">.env</code> 의{" "}
              <code className="rounded bg-background px-1">MOLIT_API_KEY</code> 에 넣으세요.
              앱의 다른 부분은 키 없이도 정상 동작합니다.
            </p>
          </Empty>
        ) : (
          <>
            <Suspense fallback={<div className="h-32" />}>
              <DiscoverForm />
            </Suspense>

            {conditions.lawdCodes.length > 0 && <RegionSyncPanel selectedLawdCodes={conditions.lawdCodes} />}

            {!hasSearchableConditions(conditions) ? (
              <Empty title="지역을 하나 이상 골라주세요">
                지역을 고른 뒤, 데이터가 없으면 먼저 위에서 수집하세요.
              </Empty>
            ) : syncStatus.length === 0 ? (
              <Empty title="아직 이 지역을 수집한 적이 없습니다">
                위 &ldquo;수집하기&rdquo;를 눌러 실거래가를 받아오세요.
              </Empty>
            ) : rows.length === 0 ? (
              <Empty title="조건에 맞는 단지가 없습니다">조건을 조금 넓혀 보세요.</Empty>
            ) : (
              <>
                <p className="text-sm text-muted">
                  {rows.length}개 단지 · 이건 매물이 아니라 최근 실거래 기록입니다.
                  지금 실제로 나온 매물은 링크를 눌러 확인하세요.
                </p>
                <ComplexResults rows={rows} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
