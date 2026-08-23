import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ListingViews, type ListingRow } from "@/components/ListingViews";
import { QuickAddForm } from "@/components/QuickAddForm";
import { Empty, PageHeader } from "@/components/ui";
import { matchesFilters, parseFilters } from "@/lib/filters";
import { getListings, sortListings } from "@/lib/listings";

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const resolved = await searchParams;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const filters = parseFilters(params);

  const all = await getListings();

  const filtered = all
    .filter((listing) => matchesFilters(listing, filters))
    .filter((listing) => !filters.hideDealBreakers || listing.score.dealBreakerViolations.length === 0);

  const sorted = sortListings(filtered, filters.sort, filters.desc);

  const rows: ListingRow[] = sorted.map((listing) => ({
    id: listing.id,
    nickname: listing.nickname,
    status: listing.status,
    dealType: listing.dealType,
    propertyType: listing.propertyType,
    complexName: listing.complexName,
    address: listing.address,
    priceManwon: listing.priceManwon,
    depositManwon: listing.depositManwon,
    monthlyRentManwon: listing.monthlyRentManwon,
    areaM2: listing.areaM2,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    builtYear: listing.builtYear,
    commuteMinutes: listing.commuteMinutes,
    tags: listing.tags,
    sourceUrl: listing.sourceUrl,
    pricePerPyeongManwon: listing.pricePerPyeongManwon,
    monthlyCostManwon: listing.monthlyCostManwon,
    scoreValue: listing.score.score,
    scoreCoverage: listing.score.coverage,
    scoreEvaluated: listing.score.evaluatedCount,
    scoreTotal: listing.score.totalCount,
    dealBreakers: listing.score.dealBreakerViolations,
    priceDelta: listing.priceChange?.deltaManwon ?? null,
  }));

  const allTags = Array.from(
    new Set(all.flatMap((listing) => listing.tags.split(",").map((t) => t.trim()).filter(Boolean))),
  ).sort();

  return (
    <>
      <PageHeader title="매물" description="관심 있는 집을 모아 비교합니다." />

      <div className="space-y-3 p-4 md:p-6">
        <QuickAddForm />

        <Suspense fallback={<div className="h-8" />}>
          <FilterBar allTags={allTags} />
        </Suspense>

        {all.length === 0 ? (
          <Empty title="아직 등록한 매물이 없습니다">
            위에 별칭만 적고 추가해 보세요. 가격과 링크는 나중에 채워도 됩니다.
          </Empty>
        ) : rows.length === 0 ? (
          <Empty title="조건에 맞는 매물이 없습니다">조건을 조금 넓혀 보세요.</Empty>
        ) : (
          <Suspense fallback={<div className="h-32" />}>
            <ListingViews rows={rows} />
          </Suspense>
        )}
      </div>
    </>
  );
}
