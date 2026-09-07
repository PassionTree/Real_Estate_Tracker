"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatPyeong } from "@/lib/area";
import { formatManwon, formatManwonShort } from "@/lib/money";
import { StatusBadge } from "@/components/ui";

export interface ListingRow {
  id: string;
  nickname: string;
  status: string;
  dealType: string;
  propertyType: string;
  complexName: string | null;
  address: string | null;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
  areaM2: number | null;
  floor: number | null;
  totalFloors: number | null;
  builtYear: number | null;
  commuteMinutes: number | null;
  tags: string;
  sourceUrl: string | null;
  pricePerPyeongManwon: number | null;
  monthlyCostManwon: number | null;
  scoreValue: number | null;
  scoreCoverage: number;
  scoreEvaluated: number;
  scoreTotal: number;
  dealBreakers: string[];
  priceDelta: number | null;
}

/** 호가 변동. 이 배지 하나 때문에 PriceHistory 를 처음부터 넣었다. */
export function PriceDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const dropped = delta < 0;
  return (
    <span
      className={`tabular inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        dropped ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"
      }`}
      title={dropped ? "직전 기록보다 내렸습니다" : "직전 기록보다 올랐습니다"}
    >
      {dropped ? "▼" : "▲"} {formatManwonShort(Math.abs(delta))}
    </span>
  );
}

export function ScoreBadge({ row }: { row: ListingRow }) {
  if (row.scoreValue === null) {
    return <span className="text-xs text-muted">미평가</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="tabular text-sm font-semibold">{Math.round(row.scoreValue)}</span>
      {/* 몇 개 항목을 보고 낸 점수인지 함께 보여준다. 2개만 채운 90점과 6개를 채운 90점은 다르다 */}
      <span className="text-xs text-muted">
        {row.scoreEvaluated}/{row.scoreTotal}
      </span>
    </span>
  );
}

function priceLabel(row: ListingRow): string {
  if (row.dealType === "월세") {
    const deposit = row.depositManwon ? formatManwonShort(row.depositManwon) : "-";
    const rent = row.monthlyRentManwon ? formatManwonShort(row.monthlyRentManwon) : "-";
    return `${deposit} / ${rent}`;
  }
  return formatManwon(row.priceManwon ?? row.depositManwon);
}

export function ListingViews({ rows }: { rows: ListingRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "card" ? "card" : "table";

  function setView(next: "table" | "card") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "table") params.delete("view");
    else params.set("view", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{rows.length}건</p>
        <div className="flex gap-1 text-xs">
          {(["table", "card"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-lg border px-2 py-1 ${
                view === option ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
              }`}
            >
              {option === "table" ? "표" : "카드"}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? <TableView rows={rows} /> : <CardView rows={rows} />}
    </div>
  );
}

function TableView({ rows }: { rows: ListingRow[] }) {
  return (
    // 좁은 화면에서 표만 가로로 스크롤되게 한다. 페이지 전체가 흔들리면 못 쓴다.
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[56rem] text-sm">
        <thead className="border-b border-line text-left text-xs text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">매물</th>
            <th className="px-3 py-2 font-medium">가격</th>
            <th className="px-3 py-2 text-right font-medium">평당가</th>
            <th className="px-3 py-2 text-right font-medium">월 주거비</th>
            <th className="px-3 py-2 font-medium">면적 · 층</th>
            <th className="px-3 py-2 text-right font-medium">준공</th>
            <th className="px-3 py-2 text-right font-medium">통근</th>
            <th className="px-3 py-2 text-right font-medium">점수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-background">
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/listings/${row.id}`} className="font-medium hover:underline">
                    {row.nickname}
                  </Link>
                  <StatusBadge status={row.status} />
                  {row.dealBreakers.length > 0 && (
                    <span
                      className="rounded bg-danger-soft px-1.5 py-0.5 text-xs text-danger"
                      title={`절대조건 위반: ${row.dealBreakers.join(", ")}`}
                    >
                      절대조건
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {[row.complexName, row.address].filter(Boolean).join(" · ") || "주소 미입력"}
                </p>
              </td>
              <td className="tabular px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span>{priceLabel(row)}</span>
                  <PriceDeltaBadge delta={row.priceDelta} />
                </div>
              </td>
              <td className="tabular px-3 py-2 text-right">
                {row.pricePerPyeongManwon ? `${Math.round(row.pricePerPyeongManwon).toLocaleString("ko-KR")}만` : "-"}
              </td>
              <td className="tabular px-3 py-2 text-right">
                {row.monthlyCostManwon ? `${row.monthlyCostManwon.toLocaleString("ko-KR")}만` : "-"}
              </td>
              <td className="px-3 py-2 text-xs">
                {row.areaM2 ? formatPyeong(row.areaM2) : "-"}
                {row.floor ? ` · ${row.floor}/${row.totalFloors ?? "?"}층` : ""}
              </td>
              <td className="tabular px-3 py-2 text-right text-xs">{row.builtYear ?? "-"}</td>
              <td className="tabular px-3 py-2 text-right text-xs">
                {row.commuteMinutes ? `${row.commuteMinutes}분` : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                <ScoreBadge row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardView({ rows }: { rows: ListingRow[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/listings/${row.id}`} className="font-medium hover:underline">
              {row.nickname}
            </Link>
            <StatusBadge status={row.status} />
          </div>

          <p className="mt-0.5 text-xs text-muted">
            {[row.complexName, row.address].filter(Boolean).join(" · ") || "주소 미입력"}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="tabular text-lg font-semibold">{priceLabel(row)}</span>
            <PriceDeltaBadge delta={row.priceDelta} />
          </div>

          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
            <div className="flex justify-between">
              <dt>평당가</dt>
              <dd className="tabular text-foreground">
                {row.pricePerPyeongManwon ? `${Math.round(row.pricePerPyeongManwon).toLocaleString("ko-KR")}만` : "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>면적</dt>
              <dd className="tabular text-foreground">{row.areaM2 ? formatPyeong(row.areaM2) : "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>준공</dt>
              <dd className="tabular text-foreground">{row.builtYear ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>통근</dt>
              <dd className="tabular text-foreground">
                {row.commuteMinutes ? `${row.commuteMinutes}분` : "-"}
              </dd>
            </div>
          </dl>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <ScoreBadge row={row} />
            {row.dealBreakers.length > 0 && (
              <span className="rounded bg-danger-soft px-1.5 py-0.5 text-xs text-danger">
                절대조건 위반
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
