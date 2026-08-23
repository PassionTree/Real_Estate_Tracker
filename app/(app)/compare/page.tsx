import { CompareGrid } from "@/components/CompareGrid";
import type { ListingRow } from "@/components/ListingViews";
import { Empty, PageHeader } from "@/components/ui";
import { getListings } from "@/lib/listings";

export default async function ComparePage() {
  const listings = await getListings();
  const candidates = listings.filter((listing) => listing.status !== "제외");

  const rows: ListingRow[] = candidates.map((listing) => ({
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

  return (
    <>
      <PageHeader title="비교" description="고른 매물을 나란히 놓고 항목마다 유리한 쪽을 표시합니다." />
      <div className="p-4 md:p-6">
        {rows.length < 2 ? (
          <Empty title="비교하려면 매물이 두 개 이상 필요합니다" />
        ) : (
          <CompareGrid listings={rows} />
        )}
      </div>
    </>
  );
}
