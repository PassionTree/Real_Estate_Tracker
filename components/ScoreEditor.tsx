"use client";

import { useOptimistic, useTransition } from "react";
import { setScore } from "@/lib/actions";

export interface CriterionRow {
  id: string;
  name: string;
  weight: number;
  isDealBreaker: boolean;
  value: number | null;
}

/**
 * 항목별 1~5점.
 *
 * 같은 점수를 다시 누르면 지워진다. "안 매김"과 "1점"은 다른 뜻이고,
 * 안 매긴 항목은 계산에서 빠져야 하기 때문이다.
 */
export function ScoreEditor({ listingId, criteria }: { listingId: string; criteria: CriterionRow[] }) {
  const [pending, startTransition] = useTransition();
  const [rows, setOptimistic] = useOptimistic(
    criteria,
    (state: CriterionRow[], update: { id: string; value: number | null }) =>
      state.map((row) => (row.id === update.id ? { ...row, value: update.value } : row)),
  );

  function choose(criterion: CriterionRow, value: number) {
    const next = criterion.value === value ? null : value;
    startTransition(async () => {
      setOptimistic({ id: criterion.id, value: next });
      await setScore(listingId, criterion.id, next);
    });
  }

  return (
    <div className={pending ? "opacity-70" : undefined}>
      <ul className="space-y-2.5">
        {rows.map((criterion) => (
          <li key={criterion.id} className="flex flex-wrap items-center gap-2">
            <span className="w-44 shrink-0 text-sm">
              {criterion.name}
              <span className="ml-1.5 text-xs text-muted">가중치 {criterion.weight}</span>
              {criterion.isDealBreaker && (
                <span className="ml-1.5 rounded bg-danger-soft px-1 py-0.5 text-xs text-danger">절대조건</span>
              )}
            </span>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(criterion, value)}
                  aria-pressed={criterion.value === value}
                  className={`h-8 w-8 rounded-lg border text-sm transition ${
                    criterion.value !== null && value <= criterion.value
                      ? "border-accent bg-accent text-white"
                      : "border-line text-muted hover:border-accent"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            {criterion.value === null && <span className="text-xs text-muted">미평가</span>}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        같은 점수를 다시 누르면 평가를 지웁니다. 미평가 항목은 계산에서 제외되므로,
        일부만 채워도 점수가 부당하게 낮아지지 않습니다.
      </p>
    </div>
  );
}
