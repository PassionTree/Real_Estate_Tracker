import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingEditForm } from "@/components/ListingEditForm";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { ScoreEditor } from "@/components/ScoreEditor";
import { Card, ExternalLinkList, PageHeader, PolicyBadge, Stat, StatusBadge } from "@/components/ui";
import { formatPyeong } from "@/lib/area";
import { calculateTotalCost } from "@/lib/cost";
import { getCriteria, getListing } from "@/lib/listings";
import { listingDeepLinks } from "@/lib/links";
import { formatManwon } from "@/lib/money";
import { acquisitionTaxPolicy } from "@/lib/policy";

export default async function ListingDetailPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const [listing, criteria] = await Promise.all([getListing(id), getCriteria()]);

  if (!listing) notFound();

  const scoreByCriterion = new Map(listing.scores.map((s) => [s.criterionId, s.value]));
  const criterionRows = criteria.map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    weight: criterion.weight,
    isDealBreaker: criterion.isDealBreaker,
    value: scoreByCriterion.get(criterion.id) ?? null,
  }));

  const cost = listing.priceManwon
    ? calculateTotalCost({
        priceManwon: listing.priceManwon,
        areaM2: listing.areaM2,
        dealType: listing.dealType,
      })
    : null;

  return (
    <>
      <PageHeader
        title={listing.nickname}
        description={[listing.complexName, listing.address].filter(Boolean).join(" · ") || undefined}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={listing.status} />
            <Link href="/listings" className="text-sm text-muted hover:text-foreground">
              목록으로
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="호가" value={formatManwon(listing.priceManwon)} />
              <Stat
                label="평당가"
                value={
                  listing.pricePerPyeongManwon
                    ? `${Math.round(listing.pricePerPyeongManwon).toLocaleString("ko-KR")}만`
                    : "-"
                }
                hint={listing.areaM2 ? formatPyeong(listing.areaM2) : undefined}
              />
              <Stat
                label="월 주거비"
                value={listing.monthlyCostManwon ? `${listing.monthlyCostManwon.toLocaleString("ko-KR")}만` : "-"}
                hint="월세 + 관리비"
              />
              <Stat
                label="종합점수"
                value={listing.score.score === null ? "미평가" : Math.round(listing.score.score)}
                hint={`${listing.score.evaluatedCount}/${listing.score.totalCount} 항목`}
              />
            </div>

            {listing.score.dealBreakerViolations.length > 0 && (
              <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                절대조건 위반: {listing.score.dealBreakerViolations.join(", ")}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-medium">상세 정보</h2>
            <div className="mt-3">
              <ListingEditForm listing={listing} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-medium">평가</h2>
            <div className="mt-3">
              <ScoreEditor listingId={listing.id} criteria={criterionRows} />
            </div>
          </Card>

          <Card>
            <h2 className="font-medium">호가 변동</h2>
            <div className="mt-3">
              <PriceHistoryChart
                points={listing.priceHistory
                  .filter((point) => point.priceManwon !== null)
                  .map((point) => ({
                    at: point.recordedAt.toISOString(),
                    priceManwon: point.priceManwon as number,
                    note: point.note,
                    recordedBy: point.recordedBy,
                  }))
                  .reverse()}
              />
            </div>
          </Card>

          {cost && (
            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">총소요자금 개산</h2>
                <PolicyBadge asOf={acquisitionTaxPolicy.asOf} source={acquisitionTaxPolicy.source} />
              </div>

              <dl className="mt-3 space-y-1 text-sm">
                <Row label={listing.dealType === "매매" ? "매매가" : "보증금"} value={cost.priceManwon} />
                {cost.acquisitionTax.totalManwon > 0 && (
                  <Row
                    label={`취득세 등 (${(cost.acquisitionTax.rate * 100).toFixed(1)}%)`}
                    value={cost.acquisitionTax.totalManwon}
                  />
                )}
                <Row label="중개보수 (상한)" value={cost.brokerageManwon} />
                {cost.legalManwon > 0 && <Row label="법무비 (추정)" value={cost.legalManwon} />}
                <div className="flex justify-between border-t border-line pt-1 font-medium">
                  <dt>합계</dt>
                  <dd className="tabular">{formatManwon(Math.round(cost.totalManwon))}</dd>
                </div>
              </dl>

              <p className="mt-2 text-xs text-muted">
                개산입니다. 다주택 중과·감면·조정지역은 반영하지 않았습니다.{" "}
                <a
                  href="https://xn--989a00af8jnslv3dba.com/%EC%B7%A8%EB%93%9D%EC%84%B8"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  정확한 계산 ↗
                </a>
              </p>
            </Card>
          )}

          <Card>
            <h2 className="font-medium">이 단지 살펴보기</h2>
            <p className="mt-1 text-xs text-muted">
              시세지도·경사도·학군은 아래 서비스들이 훨씬 잘 합니다.
            </p>
            <div className="mt-3">
              <ExternalLinkList links={listingDeepLinks(listing)} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular">{formatManwon(Math.round(value))}</dd>
    </div>
  );
}
