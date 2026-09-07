"use client";

import { useRef, useState, useTransition } from "react";
import { quickAddListing } from "@/lib/actions";
import { formatManwon, parseManwon } from "@/lib/money";

/**
 * 빠른 등록.
 *
 * 이 폼이 이 앱의 성패를 가른다.
 * 네이버 부동산을 보다가 넘어와 20개 필드를 채워야 하면 사흘 만에 엑셀로 돌아간다.
 * 별칭 하나만 있어도 저장되고, 나머지는 나중에 채운다.
 */
export function QuickAddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [priceEcho, setPriceEcho] = useState<string>("");

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await quickAddListing(formData);
          formRef.current?.reset();
          setPriceEcho("");
        });
      }}
      className="rounded-xl border border-line bg-surface p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="nickname"
          required
          placeholder="별칭 — 예: 반포 25평 A"
          className="min-w-0 flex-[2] rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />

        <div className="min-w-0 flex-1">
          <input
            name="price"
            inputMode="numeric"
            placeholder="가격 — 5억8천"
            onChange={(event) => {
              const parsed = parseManwon(event.target.value);
              setPriceEcho(parsed === null ? "" : formatManwon(parsed));
            }}
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          {/* 입력한 숫자가 실제로 얼마인지 즉시 보여준다 — 0 하나 차이를 막는다 */}
          {priceEcho && <p className="mt-0.5 px-1 text-xs text-accent">{priceEcho}</p>}
        </div>

        <input
          name="sourceUrl"
          type="url"
          placeholder="링크 (선택)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />

        <select
          name="dealType"
          defaultValue="매매"
          className="rounded-lg border border-line bg-background px-2 py-2 text-sm"
        >
          <option>매매</option>
          <option>전세</option>
          <option>월세</option>
        </select>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "추가 중" : "추가"}
        </button>
      </div>

      <p className="mt-1.5 px-1 text-xs text-muted">
        별칭만 있어도 저장됩니다. 나머지는 나중에 채우세요.
      </p>
    </form>
  );
}
