import { ImportForm } from "@/components/ImportForm";
import { Card, PageHeader } from "@/components/ui";
import { CSV_COLUMNS } from "@/lib/csv";

export default function ImportPage() {
  return (
    <>
      <PageHeader title="가져오기 · 내보내기" description="엑셀과 오갈 수 있습니다." />

      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <h2 className="font-medium">CSV 가져오기</h2>
          <div className="mt-3">
            <ImportForm />
          </div>
        </Card>

        <Card>
          <h2 className="font-medium">CSV 내보내기</h2>
          <p className="mt-1 text-sm text-muted">
            엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙여 내보냅니다.
          </p>
          <a
            href="/api/export"
            className="mt-3 inline-block rounded-lg border border-line px-3 py-2 text-sm hover:border-accent"
          >
            전체 매물 내보내기 ↓
          </a>
        </Card>

        <Card>
          <h2 className="font-medium">인식하는 열</h2>
          <p className="mt-1 text-sm text-muted">
            첫 줄을 헤더로 읽습니다. <strong className="text-foreground">별칭</strong> 만 있으면 되고
            나머지는 없어도 됩니다. 모르는 열은 무시합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {CSV_COLUMNS.map((column) => (
              <span key={column.field} className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                {column.header}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            금액 열에는 <code className="rounded bg-background px-1">58000</code>,{" "}
            <code className="rounded bg-background px-1">5억8천</code>,{" "}
            <code className="rounded bg-background px-1">5.8억</code> 을 모두 같은 값으로 읽습니다.
          </p>
        </Card>
      </div>
    </>
  );
}
