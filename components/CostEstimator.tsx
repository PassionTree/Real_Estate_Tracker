"use client";

import { useState } from "react";
import { calculateTotalCost } from "@/lib/cost";
import { formatManwon, parseManwon } from "@/lib/money";

/**
 * 총소요자금 개산.
 *
 * "이 집을 사려면 현금이 대충 얼마나 더 있어야 하나"에만 답한다.
 * 정밀 계산은 이미 잘 만들어진 곳으로 넘긴다.
 */
export function CostEstimator() {
  const [price, setPrice] = useState("58000");
  const [area, setArea] = useState("84.96");
  const [dealType, setDealType] = useState("매매");
  const [loan, setLoan] = useState("");
  const [moving, setMoving] = useState("500");

  const priceManwon = parseManwon(price);
  const areaM2 = area.trim() === "" ? null : Number(area);

  const result =
    priceManwon !== null && priceManwon > 0
      ? calculateTotalCost({
          priceManwon,
          areaM2: Number.isFinite(areaM2) ? areaM2 : null,
          dealType,
          loanManwon: parseManwon(loan) ?? 0,
          movingManwon: parseManwon(moving) ?? 0,
        })
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="가격 / 보증금" hint={priceManwon !== null ? formatManwon(priceManwon) : "읽을 수 없습니다"}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </Field>
        <Field label="거래유형">
          <select value={dealType} onChange={(e) => setDealType(e.target.value)} className={inputClass}>
            <option>매매</option>
            <option>전세</option>
            <option>월세</option>
          </select>
        </Field>
        <Field label="전용면적 (㎡)" hint="85㎡ 초과면 농어촌특별세가 붙습니다">
          <input value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
        </Field>
        <Field label="대출 예정액">
          <input value={loan} onChange={(e) => setLoan(e.target.value)} placeholder="3억" className={inputClass} />
        </Field>
        <Field label="이사 · 수리비">
          <input value={moving} onChange={(e) => setMoving(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="rounded-lg border border-line p-3">
        {result === null ? (
          <p className="text-sm text-muted">가격을 입력하면 계산합니다.</p>
        ) : (
          <>
            <dl className="space-y-1 text-sm">
              <Row label={dealType === "매매" ? "매매가" : "보증금"} value={result.priceManwon} />
              {result.acquisitionTax.totalManwon > 0 && (
                <>
                  <Row
                    label={`취득세 (${(result.acquisitionTax.rate * 100).toFixed(1)}%)`}
                    value={result.acquisitionTax.acquisitionManwon}
                  />
                  <Row label="지방교육세" value={result.acquisitionTax.localEducationManwon} />
                  {result.acquisitionTax.ruralSpecialManwon > 0 && (
                    <Row label="농어촌특별세" value={result.acquisitionTax.ruralSpecialManwon} />
                  )}
                </>
              )}
              <Row label="중개보수 (상한)" value={result.brokerageManwon} />
              {result.legalManwon > 0 && <Row label="법무비 (추정)" value={result.legalManwon} />}
              {result.movingManwon > 0 && <Row label="이사 · 수리비" value={result.movingManwon} />}

              <div className="flex justify-between border-t border-line pt-1.5 font-medium">
                <dt>총소요자금</dt>
                <dd className="tabular">{formatManwon(Math.round(result.totalManwon))}</dd>
              </div>
              <div className="flex justify-between text-accent">
                <dt className="font-medium">필요한 현금</dt>
                <dd className="tabular font-semibold">{formatManwon(Math.round(result.ownCashManwon))}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-muted">
              개산입니다. 다주택 중과·생애최초 감면·조정대상지역은 반영하지 않았습니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const inputClass = "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </label>
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
