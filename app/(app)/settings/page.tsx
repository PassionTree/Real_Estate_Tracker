import { CriteriaSettings } from "@/components/CriteriaSettings";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getCriteria } from "@/lib/listings";

export default async function SettingsPage() {
  const [criteria, listings] = await Promise.all([
    getCriteria(),
    prisma.listing.findMany({
      where: { status: { not: "제외" } },
      select: { id: true, nickname: true, scores: { select: { criterionId: true, value: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="설정" description="무엇을 중요하게 볼지 정합니다." />

      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <h2 className="font-medium">평가 항목과 가중치</h2>
          <p className="mt-1 text-sm text-muted">
            항목이 많으면 아무도 채우지 않습니다. 정말 판단에 쓰는 것만 남기세요.
          </p>
          <div className="mt-4">
            <CriteriaSettings criteria={criteria} listings={listings} />
          </div>
        </Card>

        <Card>
          <h2 className="font-medium">데이터</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>
              <a href="/api/export" className="text-accent underline">
                전체 매물 CSV 내보내기 ↗
              </a>{" "}
              — 엑셀에서 열리고, 사실상의 백업입니다.
            </li>
            <li>
              <code className="rounded bg-background px-1">npm run backup</code> — 데이터베이스 파일을
              backups/ 에 복사합니다. 디스크가 통째로 죽는 경우를 대비해 가끔 다른 저장소로도 옮겨 두세요.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
