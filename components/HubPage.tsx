import { CostEstimator } from "@/components/CostEstimator";
import { Card, ExternalLinkList, PageHeader, PolicyBadge } from "@/components/ui";
import { hubSection } from "@/lib/links";
import { acquisitionTaxPolicy, brokerageFeePolicy } from "@/lib/policy";

/**
 * 링크 허브.
 *
 * "부동산의 모든 것을 한 사이트에서"를 자체 기능이 붙기 전까지 링크 모음으로 먼저 달성한다.
 * 빈 "준비 중" 페이지를 두면 원래 목표와 멀어진다.
 */
export function HubPage({ slug }: { slug: "finance" | "policy" | "market" }) {
  const section = hubSection(slug);

  return (
    <>
      <PageHeader title={section.title} description={section.intro} />

      <div className="space-y-4 p-4 md:p-6">
        {slug === "finance" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">총소요자금 개산</h2>
              <div className="flex gap-1.5">
                <PolicyBadge asOf={acquisitionTaxPolicy.asOf} source={acquisitionTaxPolicy.source} />
                <PolicyBadge asOf={brokerageFeePolicy.asOf} source={brokerageFeePolicy.source} />
              </div>
            </div>
            <div className="mt-4">
              <CostEstimator />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-medium">바로 가기</h2>
          <div className="mt-3">
            <ExternalLinkList links={section.links} />
          </div>
        </Card>

        <Card>
          <h2 className="font-medium">앞으로 여기에 들어올 것</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {section.roadmap.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-line">□</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            매물 트래커를 먼저 쓰면서, 실제로 아쉬운 것부터 하나씩 채워 갑니다.
          </p>
        </Card>
      </div>
    </>
  );
}
