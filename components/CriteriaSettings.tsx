"use client";

import { useOptimistic, useTransition } from "react";
import { addCriterion, deleteCriterion, updateCriterion } from "@/lib/actions";
import { type Criterion, calculateScore } from "@/lib/scoring";

export interface CriterionSetting extends Criterion {
  id: string;
}

export interface PreviewListing {
  id: string;
  nickname: string;
  scores: { criterionId: string; value: number }[];
}

/**
 * 가중치 조정.
 *
 * 슬라이더를 움직이면 아래 순위가 즉시 바뀐다.
 * 점수 원본은 이미 받아와 있으므로 서버를 다시 부르지 않고 화면에서 다시 계산한다.
 * 이 즉각적인 반응이 없으면 가중치 기능을 아무도 만지지 않는다.
 */
export function CriteriaSettings({
  criteria,
  listings,
}: {
  criteria: CriterionSetting[];
  listings: PreviewListing[];
}) {
  const [pending, startTransition] = useTransition();
  const [rows, setOptimistic] = useOptimistic(
    criteria,
    (state: CriterionSetting[], update: Partial<CriterionSetting> & { id: string }) =>
      state.map((row) => (row.id === update.id ? { ...row, ...update } : row)),
  );

  function change(criterion: CriterionSetting, patch: Partial<CriterionSetting>) {
    const next = { ...criterion, ...patch };
    startTransition(async () => {
      setOptimistic({ id: criterion.id, ...patch });
      await updateCriterion(criterion.id, next.weight, next.isDealBreaker);
    });
  }

  const preview = listings
    .map((listing) => ({ listing, result: calculateScore(rows, listing.scores) }))
    .filter((entry) => entry.result.score !== null)
    .sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0))
    .slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={pending ? "opacity-70" : undefined}>
        <ul className="space-y-3">
          {rows.map((criterion) => (
            <li key={criterion.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{criterion.name}</span>
                <form
                  action={async () => {
                    await deleteCriterion(criterion.id);
                  }}
                >
                  <button type="submit" className="text-xs text-muted hover:text-danger">
                    삭제
                  </button>
                </form>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={criterion.weight}
                  onChange={(event) => change(criterion, { weight: Number(event.target.value) })}
                  className="flex-1 accent-[var(--accent)]"
                />
                <span className="tabular w-4 text-sm">{criterion.weight}</span>
              </div>

              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={criterion.isDealBreaker}
                  onChange={(event) => change(criterion, { isDealBreaker: event.target.checked })}
                />
                절대조건 — 2점 이하면 순위에서 내리고 표시합니다
              </label>
            </li>
          ))}
        </ul>

        <form action={addCriterion} className="mt-3 flex gap-2">
          <input
            name="name"
            required
            placeholder="항목 추가 — 예: 반려동물 가능"
            className="flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          <input
            name="weight"
            type="number"
            min={0}
            max={5}
            defaultValue={3}
            className="w-16 rounded-lg border border-line bg-background px-2 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm">
            추가
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-line p-3">
        <h3 className="text-sm font-medium">지금 가중치로 매긴 순위</h3>
        {preview.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 점수를 매긴 매물이 없습니다.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {preview.map((entry, index) => (
              <li key={entry.listing.id} className="flex items-center gap-2 text-sm">
                <span className="tabular w-4 text-muted">{index + 1}</span>
                <span className="flex-1 truncate">{entry.listing.nickname}</span>
                {entry.result.dealBreakerViolations.length > 0 && (
                  <span className="rounded bg-danger-soft px-1 py-0.5 text-xs text-danger">위반</span>
                )}
                <span className="tabular font-semibold">{Math.round(entry.result.score ?? 0)}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted">
          가중치를 움직이면 순위가 바로 바뀝니다. 절대조건을 어긴 매물은 목록에서 지우지 않고 뒤로 보냅니다 —
          조건은 바뀌기 때문입니다.
        </p>
      </div>
    </div>
  );
}
