import Link from "next/link";
import { Card, Empty, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { PriceDeltaBadge } from "@/components/ListingViews";
import { STATUSES } from "@/lib/filters";
import { filterRecentPriceChanges, getListings } from "@/lib/listings";
import { formatManwon } from "@/lib/money";

export default async function DashboardPage() {
  const listings = await getListings();

  if (listings.length === 0) {
    return (
      <>
        <PageHeader title="대시보드" />
        <div className="p-4 md:p-6">
          <Empty title="아직 데이터가 없습니다">
            <Link href="/listings" className="text-accent underline">
              매물부터 몇 개 등록해 보세요
            </Link>
          </Empty>
        </div>
      </>
    );
  }

  const active = listings.filter((l) => l.status !== "제외");

  const ranked = active
    .filter((l) => l.score.score !== null && l.score.dealBreakerViolations.length === 0)
    .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0))
    .slice(0, 5);

  const recentChanges = filterRecentPriceChanges(active, 7);

  const visits = active.filter((l) => l.status === "임장예정");

  const priced = active.filter((l) => l.priceManwon !== null);
  const cheapest = priced.length
    ? priced.reduce((min, l) => ((l.priceManwon ?? 0) < (min.priceManwon ?? 0) ? l : min))
    : null;

  return (
    <>
      <PageHeader title="대시보드" description="지금 어디까지 왔는지 한 화면에서 봅니다." />

      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="전체 매물" value={`${listings.length}건`} hint={`제외 ${listings.length - active.length}건`} />
            <Stat label="평가 완료" value={`${active.filter((l) => l.score.score !== null).length}건`} />
            <Stat label="이번 주 가격 변동" value={`${recentChanges.length}건`} />
            <Stat
              label="최저 호가"
              value={cheapest ? formatManwon(cheapest.priceManwon) : "-"}
              hint={cheapest?.nickname}
            />
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-medium">상태별 진행</h2>
            <ul className="mt-3 space-y-1.5">
              {STATUSES.map((status) => {
                const count = listings.filter((l) => l.status === status).length;
                const ratio = listings.length ? (count / listings.length) * 100 : 0;
                return (
                  <li key={status} className="flex items-center gap-2 text-sm">
                    <span className="w-20 shrink-0">
                      <StatusBadge status={status} />
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${ratio}%` }} />
                    </span>
                    <span className="tabular w-8 text-right text-muted">{count}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="font-medium">종합점수 상위</h2>
            {ranked.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                아직 점수를 매긴 매물이 없습니다. 매물 상세의 평가 탭에서 몇 개만 눌러 보세요.
              </p>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {ranked.map((listing, index) => (
                  <li key={listing.id} className="flex items-center gap-2 text-sm">
                    <span className="tabular w-4 text-muted">{index + 1}</span>
                    <Link href={`/listings/${listing.id}`} className="flex-1 truncate hover:underline">
                      {listing.nickname}
                    </Link>
                    <span className="tabular font-semibold">{Math.round(listing.score.score ?? 0)}</span>
                    <span className="text-xs text-muted">
                      {listing.score.evaluatedCount}/{listing.score.totalCount}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">이번 주 호가 변동</h2>
            {recentChanges.length === 0 ? (
              <p className="mt-3 text-sm text-muted">최근 7일 동안 바뀐 호가가 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {recentChanges.map((listing) => (
                  <li key={listing.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/listings/${listing.id}`} className="flex-1 truncate hover:underline">
                      {listing.nickname}
                    </Link>
                    <span className="tabular text-muted">{formatManwon(listing.priceManwon)}</span>
                    <PriceDeltaBadge delta={listing.priceChange?.deltaManwon ?? null} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">임장 예정</h2>
            {visits.length === 0 ? (
              <p className="mt-3 text-sm text-muted">임장 예정으로 표시한 매물이 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {visits.map((listing) => (
                  <li key={listing.id} className="text-sm">
                    <Link href={`/listings/${listing.id}`} className="hover:underline">
                      {listing.nickname}
                    </Link>
                    <span className="ml-2 text-xs text-muted">
                      {listing.address ?? listing.complexName ?? "주소 미입력"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
