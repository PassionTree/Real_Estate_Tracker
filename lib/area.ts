/** 면적 변환과 평당가. */

/** 1평 = 400/121 ㎡ ≒ 3.305785 */
export const M2_PER_PYEONG = 400 / 121;

export function m2ToPyeong(m2: number | null | undefined): number | null {
  if (m2 === null || m2 === undefined || Number.isNaN(m2)) return null;
  return m2 / M2_PER_PYEONG;
}

export function pyeongToM2(pyeong: number | null | undefined): number | null {
  if (pyeong === null || pyeong === undefined || Number.isNaN(pyeong)) return null;
  return pyeong * M2_PER_PYEONG;
}

/** 표시용. 84.96㎡ → "25.7평" */
export function formatPyeong(m2: number | null | undefined): string {
  const p = m2ToPyeong(m2);
  if (p === null) return "-";
  return `${p.toFixed(1)}평`;
}

/**
 * 평당가(만원/평).
 * 호가만 보면 판단이 흐려지므로 목록·비교에 항상 함께 띄운다.
 */
export function pricePerPyeong(
  priceManwon: number | null | undefined,
  areaM2: number | null | undefined,
): number | null {
  if (!priceManwon || !areaM2) return null;
  const pyeong = m2ToPyeong(areaM2);
  if (pyeong === null || pyeong <= 0) return null;
  return priceManwon / pyeong;
}

/**
 * 월 총주거비(만원).
 * 월세만 비교하면 관리비가 비싼 집을 놓친다.
 */
export function monthlyHousingCost(listing: {
  monthlyRentManwon?: number | null;
  maintenanceManwon?: number | null;
}): number | null {
  const rent = listing.monthlyRentManwon ?? 0;
  const maintenance = listing.maintenanceManwon ?? 0;
  if (rent === 0 && maintenance === 0) return null;
  return rent + maintenance;
}
