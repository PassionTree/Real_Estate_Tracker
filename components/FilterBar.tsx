"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  DEAL_TYPES,
  EMPTY_FILTERS,
  PROPERTY_TYPES,
  SORT_LABELS,
  SORT_KEYS,
  STATUSES,
  type ListingFilters,
  type SortKey,
  hasActiveFilters,
  parseFilters,
  serializeFilters,
} from "@/lib/filters";

/**
 * 필터를 URL 에 반영한다.
 * "이 조건으로 걸러낸 집들 봐봐" 하고 배우자에게 링크 하나로 넘길 수 있어야 한다.
 */
export function FilterBar({ allTags }: { allTags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(new URLSearchParams(searchParams.toString()));
  const [open, setOpen] = useState(false);

  function apply(next: Partial<ListingFilters>) {
    const merged = { ...filters, ...next };
    const query = serializeFilters(merged).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function toggle(key: "status" | "dealType" | "propertyType" | "tags", value: string) {
    const current = filters[key];
    apply({
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    } as Partial<ListingFilters>);
  }

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition ${
      active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-foreground"
    }`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggle("status", status)}
            className={chip(filters.status.includes(status))}
          >
            {status}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-line" />

        <select
          value={filters.sort}
          onChange={(event) => apply({ sort: event.target.value as SortKey })}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => apply({ desc: !filters.desc })}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
          title={filters.desc ? "내림차순" : "오름차순"}
        >
          {filters.desc ? "↓" : "↑"}
        </button>

        <button type="button" onClick={() => setOpen((v) => !v)} className={chip(open)}>
          상세 조건 {open ? "▲" : "▼"}
        </button>

        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => apply({ ...EMPTY_FILTERS, sort: filters.sort, desc: filters.desc })}
            className="text-xs text-muted underline hover:text-foreground"
          >
            조건 지우기
          </button>
        )}
      </div>

      {open && (
        <div className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs">
            <span className="text-muted">검색어</span>
            <input
              defaultValue={filters.q}
              onBlur={(event) => apply({ q: event.target.value })}
              placeholder="별칭 · 주소 · 단지명 · 메모"
              className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
            />
          </label>

          <Range
            label="가격 (만원)"
            min={filters.minPrice}
            max={filters.maxPrice}
            onChange={(min, max) => apply({ minPrice: min, maxPrice: max })}
          />
          <Range
            label="전용면적 (㎡)"
            min={filters.minArea}
            max={filters.maxArea}
            onChange={(min, max) => apply({ minArea: min, maxArea: max })}
          />

          <label className="text-xs">
            <span className="text-muted">준공 이후</span>
            <input
              type="number"
              defaultValue={filters.builtAfter ?? ""}
              onBlur={(event) =>
                apply({ builtAfter: event.target.value === "" ? null : Number(event.target.value) })
              }
              placeholder="2010"
              className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-xs">
            <span className="text-muted">통근 시간 이내 (분)</span>
            <input
              type="number"
              defaultValue={filters.maxCommute ?? ""}
              onBlur={(event) =>
                apply({ maxCommute: event.target.value === "" ? null : Number(event.target.value) })
              }
              placeholder="40"
              className="mt-1 w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
            />
          </label>

          <div className="text-xs">
            <span className="text-muted">거래 · 매물 유형</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {DEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle("dealType", type)}
                  className={chip(filters.dealType.includes(type))}
                >
                  {type}
                </button>
              ))}
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle("propertyType", type)}
                  className={chip(filters.propertyType.includes(type))}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="text-xs sm:col-span-2 lg:col-span-3">
              <span className="text-muted">태그</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle("tags", tag)}
                    className={chip(filters.tags.includes(tag))}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={filters.hideDealBreakers}
              onChange={(event) => apply({ hideDealBreakers: event.target.checked })}
            />
            <span>절대조건을 어긴 매물 숨기기</span>
          </label>
        </div>
      )}
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
          onBlur={(event) => onChange(parse(event.target.value), max)}
          placeholder="최소"
          className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
        />
        <span className="text-muted">~</span>
        <input
          type="number"
          defaultValue={max ?? ""}
          onBlur={(event) => onChange(min, parse(event.target.value))}
          placeholder="최대"
          className="w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}
