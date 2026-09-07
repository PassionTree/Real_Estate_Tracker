"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPyeong } from "@/lib/area";
import { formatManwon } from "@/lib/money";
import type { ListingRow } from "@/components/ListingViews";

type Direction = "low" | "high" | "none";

interface Row {
  label: string;
  /** 어느 쪽이 유리한지. 정해지지 않는 항목은 강조하지 않는다 */
  better: Direction;
  value: (listing: ListingRow) => number | null;
  format: (listing: ListingRow) => string;
}

const ROWS: Row[] = [
  {
    label: "가격",
    better: "low",
    value: (l) => l.priceManwon ?? l.depositManwon,
    format: (l) => formatManwon(l.priceManwon ?? l.depositManwon),
  },
  {
    label: "평당가",
    better: "low",
    value: (l) => l.pricePerPyeongManwon,
    format: (l) =>
      l.pricePerPyeongManwon ? `${Math.round(l.pricePerPyeongManwon).toLocaleString("ko-KR")}만` : "-",
  },
  {
    label: "월 주거비",
    better: "low",
    value: (l) => l.monthlyCostManwon,
    format: (l) => (l.monthlyCostManwon ? `${l.monthlyCostManwon.toLocaleString("ko-KR")}만` : "-"),
  },
  {
    label: "전용면적",
    better: "high",
    value: (l) => l.areaM2,
    format: (l) => (l.areaM2 ? `${formatPyeong(l.areaM2)} (${l.areaM2}㎡)` : "-"),
  },
  { label: "준공년도", better: "high", value: (l) => l.builtYear, format: (l) => String(l.builtYear ?? "-") },
  {
    label: "통근 시간",
    better: "low",
    value: (l) => l.commuteMinutes,
    format: (l) => (l.commuteMinutes ? `${l.commuteMinutes}분` : "-"),
  },
  {
    label: "층",
    better: "none",
    value: () => null,
    format: (l) => (l.floor ? `${l.floor}/${l.totalFloors ?? "?"}층` : "-"),
  },
  { label: "종합점수", better: "high", value: (l) => l.scoreValue, format: (l) => (l.scoreValue === null ? "미평가" : String(Math.round(l.scoreValue))) },
  { label: "상태", better: "none", value: () => null, format: (l) => l.status },
  { label: "단지", better: "none", value: () => null, format: (l) => l.complexName ?? "-" },
];

export function CompareGrid({ listings }: { listings: ListingRow[] }) {
  const [selected, setSelected] = useState<string[]>(listings.slice(0, 3).map((l) => l.id));
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const chosen = selected
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is ListingRow => Boolean(l));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((v) => v !== id)
        : current.length >= 4
          ? current // 4개를 넘으면 화면에서 읽히지 않는다
          : [...current, id],
    );
  }

  const visibleRows = ROWS.filter((row) => {
    if (!onlyDifferences) return true;
    const values = chosen.map((listing) => row.format(listing));
    return new Set(values).size > 1;
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">비교할 매물 (최대 4개)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listings.map((listing) => {
            const active = selected.includes(listing.id);
            return (
              <button
                key={listing.id}
                type="button"
                onClick={() => toggle(listing.id)}
                disabled={!active && selected.length >= 4}
                className={`rounded-full border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                  active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                }`}
              >
                {listing.nickname}
              </button>
            );
          })}
        </div>
      </div>

      {chosen.length < 2 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          두 개 이상 골라야 비교할 수 있습니다.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyDifferences}
              onChange={(event) => setOnlyDifferences(event.target.checked)}
            />
            다른 점만 보기
          </label>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted">항목</th>
                  {chosen.map((listing) => (
                    <th key={listing.id} className="px-3 py-2 text-left">
                      <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                        {listing.nickname}
                      </Link>
                      {listing.dealBreakers.length > 0 && (
                        <span className="ml-1.5 rounded bg-danger-soft px-1 py-0.5 text-xs text-danger">
                          절대조건
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const values = chosen.map((listing) => row.value(listing));
                  const present = values.filter((v): v is number => v !== null);

                  // 값이 하나뿐이면 "가장 유리한 값"이라는 표시가 의미 없다
                  const best =
                    row.better === "none" || present.length < 2
                      ? null
                      : row.better === "low"
                        ? Math.min(...present)
                        : Math.max(...present);

                  return (
                    <tr key={row.label} className="border-b border-line last:border-0">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">{row.label}</th>
                      {chosen.map((listing, index) => {
                        const isBest = best !== null && values[index] === best;
                        return (
                          <td
                            key={listing.id}
                            className={`tabular px-3 py-2 ${isBest ? "font-semibold text-accent" : ""}`}
                          >
                            {row.format(listing)}
                            {isBest && <span className="ml-1 text-xs">◀</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleRows.length === 0 && (
            <p className="text-center text-sm text-muted">고른 매물들의 값이 모두 같습니다.</p>
          )}
        </>
      )}
    </div>
  );
}
