"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import lawdCodes from "@/data/lawd-codes.json";
import {
  DISCOVER_SORT_KEYS,
  DISCOVER_SORT_LABELS,
  type DiscoverConditions,
  parseDiscoverConditions,
  serializeDiscoverConditions,
} from "@/lib/discover";

/** 조건을 URL 에 반영한다. 다른 조건으로 다시 찾을 링크를 배우자에게 그대로 넘길 수 있다. */
export function DiscoverForm({ onLawdCodesChange }: { onLawdCodesChange?: (codes: string[]) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conditions = parseDiscoverConditions(new URLSearchParams(searchParams.toString()));

  function apply(next: Partial<DiscoverConditions>) {
    const merged = { ...conditions, ...next };
    const query = serializeDiscoverConditions(merged).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    onLawdCodesChange?.(merged.lawdCodes);
  }

  function toggleRegion(code: string) {
    apply({
      lawdCodes: conditions.lawdCodes.includes(code)
        ? conditions.lawdCodes.filter((c) => c !== code)
        : [...conditions.lawdCodes, code],
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
      <div>
        <p className="text-xs text-muted">지역 (하나 이상)</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {lawdCodes.regions.map((region) => (
            <button
              key={region.code}
              type="button"
              onClick={() => toggleRegion(region.code)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                conditions.lawdCodes.includes(region.code)
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Range
          label="가격 (만원)"
          min={conditions.minPriceManwon}
          max={conditions.maxPriceManwon}
          onChange={(min, max) => apply({ minPriceManwon: min, maxPriceManwon: max })}
        />
        <Range
          label="전용면적 (㎡)"
          min={conditions.minAreaM2}
          max={conditions.maxAreaM2}
          onChange={(min, max) => apply({ minAreaM2: min, maxAreaM2: max })}
        />
        <label className="text-xs">
          <span className="text-muted">준공 이후</span>
          <input
            type="number"
            defaultValue={conditions.builtAfter ?? ""}
            onBlur={(e) => apply({ builtAfter: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="2010"
            className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted">실거래 조회 기간</span>
          <select
            value={conditions.recentMonths ?? ""}
            onChange={(e) => apply({ recentMonths: e.target.value === "" ? null : Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
          >
            <option value="6">최근 6개월</option>
            <option value="12">최근 12개월</option>
            <option value="24">최근 24개월</option>
            <option value="">전체 기간</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="text-muted">정렬</span>
          <select
            value={conditions.sort}
            onChange={(e) => apply({ sort: e.target.value as DiscoverConditions["sort"] })}
            className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
          >
            {DISCOVER_SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {DISCOVER_SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  onChange,
}: {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const parse = (value: string) => (value === "" ? null : Number(value));
  return (
    <div className="text-xs">
      <span className="text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          defaultValue={min ?? ""}
          onBlur={(e) => onChange(parse(e.target.value), max)}
          placeholder="최소"
          className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-muted">~</span>
        <input
          type="number"
          defaultValue={max ?? ""}
          onBlur={(e) => onChange(min, parse(e.target.value))}
          placeholder="최대"
          className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}
