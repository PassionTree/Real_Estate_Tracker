"use client";

import { useState, useTransition } from "react";
import { updateListing } from "@/lib/actions";
import { formatManwon, parseManwon } from "@/lib/money";

export interface ListingFormValues {
  id: string;
  nickname: string;
  dealType: string;
  propertyType: string;
  status: string;
  priceManwon: number | null;
  depositManwon: number | null;
  monthlyRentManwon: number | null;
  maintenanceManwon: number | null;
  address: string | null;
  lawdCd: string | null;
  complexName: string | null;
  dong: string | null;
  ho: string | null;
  areaM2: number | null;
  supplyAreaM2: number | null;
  floor: number | null;
  totalFloors: number | null;
  builtYear: number | null;
  householdCount: number | null;
  rooms: number | null;
  bathrooms: number | null;
  direction: string | null;
  parking: string | null;
  petsAllowed: boolean | null;
  commuteMinutes: number | null;
  tags: string;
  sourceUrl: string | null;
  memo: string | null;
}

const STATUSES = ["관심", "임장예정", "임장완료", "보류", "제외", "계약"];
const DEAL_TYPES = ["매매", "전세", "월세"];
const PROPERTY_TYPES = ["아파트", "오피스텔", "빌라", "단독"];

/**
 * 상세 편집.
 *
 * 자주 보는 것만 위에 두고 나머지는 접어 둔다.
 * 필드 20개가 한꺼번에 펼쳐져 있으면 채울 마음이 사라진다.
 */
export function ListingEditForm({ listing }: { listing: ListingFormValues }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [priceEcho, setPriceEcho] = useState(formatManwon(listing.priceManwon));

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await updateListing(listing.id, formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="별칭">
          <input name="nickname" defaultValue={listing.nickname} className={inputClass} />
        </Field>

        <Field label="상태">
          <select name="status" defaultValue={listing.status} className={inputClass}>
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>

        <Field label="거래유형">
          <select name="dealType" defaultValue={listing.dealType} className={inputClass}>
            {DEAL_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>

        <Field label="매물유형">
          <select name="propertyType" defaultValue={listing.propertyType} className={inputClass}>
            {PROPERTY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>

        <Field label="가격 / 보증금" hint={priceEcho !== "-" ? priceEcho : undefined}>
          <input
            name="priceManwon"
            defaultValue={listing.priceManwon ?? ""}
            placeholder="5억8천"
            onChange={(event) => {
              const parsed = parseManwon(event.target.value);
              setPriceEcho(parsed === null ? "-" : formatManwon(parsed));
            }}
            className={inputClass}
          />
        </Field>

        <Field label="월세 (만원)">
          <input name="monthlyRentManwon" defaultValue={listing.monthlyRentManwon ?? ""} className={inputClass} />
        </Field>

        <Field label="관리비 (만원)">
          <input name="maintenanceManwon" defaultValue={listing.maintenanceManwon ?? ""} className={inputClass} />
        </Field>

        <Field label="통근 시간 (분)" hint="실제 출근 시간대에 재보세요">
          <input
            name="commuteMinutes"
            type="number"
            defaultValue={listing.commuteMinutes ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      {/* 가격이 바뀔 때 왜 바뀌었는지 함께 남긴다 */}
      <Field label="가격 변동 메모" hint="가격을 바꿔 저장할 때만 기록에 남습니다">
        <input name="priceNote" placeholder="중개사 전화 — 5천 조정 가능" className={inputClass} />
      </Field>

      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium">위치 · 단지</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="주소">
            <input name="address" defaultValue={listing.address ?? ""} className={inputClass} />
          </Field>
          <Field label="단지명">
            <input name="complexName" defaultValue={listing.complexName ?? ""} className={inputClass} />
          </Field>
          <Field label="법정동코드 (5자리)" hint="실거래가 연동에 쓰입니다">
            <input name="lawdCd" defaultValue={listing.lawdCd ?? ""} placeholder="11650" className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="동">
              <input name="dong" defaultValue={listing.dong ?? ""} className={inputClass} />
            </Field>
            <Field label="호">
              <input name="ho" defaultValue={listing.ho ?? ""} className={inputClass} />
            </Field>
          </div>
        </div>
      </details>

      <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium">면적 · 구조</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="전용면적 (㎡)">
            <input name="areaM2" defaultValue={listing.areaM2 ?? ""} className={inputClass} />
          </Field>
          <Field label="공급면적 (㎡)">
            <input name="supplyAreaM2" defaultValue={listing.supplyAreaM2 ?? ""} className={inputClass} />
          </Field>
          <Field label="준공년도">
            <input name="builtYear" type="number" defaultValue={listing.builtYear ?? ""} className={inputClass} />
          </Field>
          <Field label="층">
            <input name="floor" type="number" defaultValue={listing.floor ?? ""} className={inputClass} />
          </Field>
          <Field label="총층">
            <input name="totalFloors" type="number" defaultValue={listing.totalFloors ?? ""} className={inputClass} />
          </Field>
          <Field label="세대수">
            <input
              name="householdCount"
              type="number"
              defaultValue={listing.householdCount ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="방">
            <input name="rooms" type="number" defaultValue={listing.rooms ?? ""} className={inputClass} />
          </Field>
          <Field label="욕실">
            <input name="bathrooms" type="number" defaultValue={listing.bathrooms ?? ""} className={inputClass} />
          </Field>
          <Field label="향">
            <input name="direction" defaultValue={listing.direction ?? ""} placeholder="남향" className={inputClass} />
          </Field>
          <Field label="주차">
            <input name="parking" defaultValue={listing.parking ?? ""} placeholder="세대당 1.2대" className={inputClass} />
          </Field>
          <Field label="반려동물">
            <select
              name="petsAllowed"
              defaultValue={listing.petsAllowed === null ? "" : listing.petsAllowed ? "가능" : "불가"}
              className={inputClass}
            >
              <option value="">미확인</option>
              <option value="가능">가능</option>
              <option value="불가">불가</option>
            </select>
          </Field>
        </div>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="태그" hint="콤마로 구분">
          <input name="tags" defaultValue={listing.tags} placeholder="역세권, 학군" className={inputClass} />
        </Field>
        <Field label="링크">
          <input name="sourceUrl" type="url" defaultValue={listing.sourceUrl ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="메모">
        <textarea name="memo" rows={4} defaultValue={listing.memo ?? ""} className={inputClass} />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "저장 중" : "저장"}
        </button>
        {saved && <span className="text-sm text-accent">저장했습니다</span>}
      </div>
    </form>
  );
}

const inputClass = "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
