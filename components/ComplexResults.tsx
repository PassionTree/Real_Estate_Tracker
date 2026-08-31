"use client";

import { useState, useTransition } from "react";
import { addComplexAsListing } from "@/lib/actions";
import { formatPyeong } from "@/lib/area";
import { complexSearchLinks } from "@/lib/links";
import { formatManwon } from "@/lib/money";

export interface ComplexResultRow {
  key: string;
  aptNm: string;
  umdNm: string | null;
  buildYear: number | null;
  areaGroup: number;
  dealCount: number;
  medianManwon: number;
  minManwon: number;
  maxManwon: number;
  latestDealDate: string; // ISO
}

/**
 * 조건에 맞는 단지 후보.
 *
 * 이건 "매물"이 아니라 "단지"다. 실거래가는 몇 동 몇 호가 아니라
 * 이 단지 이 평형이 최근 얼마에 거래됐는지를 보여준다.
 * 지금 실제로 나온 매물·호가는 딥링크를 눌러 직접 확인해야 한다.
 */
export function ComplexResults({ rows }: { rows: ComplexResultRow[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <ComplexRow key={row.key} row={row} />
      ))}
    </ul>
  );
}

function ComplexRow({ row }: { row: ComplexResultRow }) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const links = complexSearchLinks(row.aptNm);

  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{row.aptNm}</p>
          <p className="text-xs text-muted">
            {[row.umdNm, row.buildYear ? `${row.buildYear}년 준공` : null, formatPyeong(row.areaGroup)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          disabled={pending || added}
          onClick={() =>
            startTransition(async () => {
              await addComplexAsListing(row);
              setAdded(true);
            })
          }
          className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs disabled:opacity-50"
        >
          {added ? "담았습니다" : "관심 매물로 담기"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="tabular font-semibold">{formatManwon(row.medianManwon)}</span>
        <span className="text-xs text-muted">
          실거래 중앙값 · {row.dealCount}건 · {formatManwon(row.minManwon)}~{formatManwon(row.maxManwon)}
        </span>
        <span className="text-xs text-muted">
          최근 거래 {new Date(row.latestDealDate).toLocaleDateString("ko-KR")}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-background px-2 py-0.5 text-xs text-muted hover:text-foreground"
          >
            {link.label} ↗
          </a>
        ))}
      </div>
    </li>
  );
}
