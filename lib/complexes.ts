/**
 * 실거래를 (단지 × 평형) 단위로 묶는다.
 *
 * "조건에 맞는 단지 찾기"의 핵심이다. 순수 함수로 둬서
 * Prisma 나 API 없이도 테스트할 수 있게 한다.
 */

export interface TransactionLike {
  aptSeq: string | null;
  aptNm: string;
  lawdCd: string;
  umdNm: string | null;
  buildYear: number | null;
  areaGroup: number;
  dealAmountManwon: number;
  dealDate: Date;
  canceled: boolean;
}

export interface ComplexCandidate {
  /** aptSeq 가 있으면 그걸, 없으면 정규화한 단지명을 키로 쓴다 */
  key: string;
  aptNm: string;
  lawdCd: string;
  umdNm: string | null;
  buildYear: number | null;
  areaGroup: number;
  dealCount: number;
  medianManwon: number;
  minManwon: number;
  maxManwon: number;
  latestDealDate: Date;
}

/**
 * 단지명 정규화. aptSeq 가 없는 거래를 묶을 때 쓰는 폴백 키다.
 * 공백·특수문자를 제거해 "래미안 퍼스티지"와 "래미안퍼스티지"를 같게 본다.
 */
export function normalizeComplexName(name: string): string {
  return name.replace(/[\s\-_()·]/g, "").toLowerCase();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // 평균은 튄 거래 하나에 끌려간다. 중앙값이 실제 시세 감각에 더 가깝다.
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * (단지 × 평형)으로 묶어 후보 목록을 만든다.
 *
 * - 해제된 거래는 집계에서 뺀다. 취소된 계약 하나가 시세 판단을 흔들면 안 된다
 * - 같은 단지라도 평형이 다르면 다른 후보다 — 59㎡와 84㎡는 가격이 다른 집이다
 */
export function aggregateComplexes(transactions: TransactionLike[]): ComplexCandidate[] {
  const groups = new Map<string, TransactionLike[]>();

  for (const t of transactions) {
    if (t.canceled) continue;

    const identity = t.aptSeq ?? normalizeComplexName(t.aptNm);
    const key = `${identity}|${t.areaGroup}`;

    const group = groups.get(key);
    if (group) group.push(t);
    else groups.set(key, [t]);
  }

  const candidates: ComplexCandidate[] = [];

  for (const [key, group] of groups) {
    const amounts = group.map((t) => t.dealAmountManwon);
    // 그룹 안에서 가장 최근 정보(단지명 표기·법정동명·준공년도)를 대표값으로 쓴다.
    // 같은 단지라도 회차마다 표기가 살짝 다를 수 있어, 최신 것을 신뢰한다.
    const latest = [...group].sort((a, b) => b.dealDate.getTime() - a.dealDate.getTime())[0];

    candidates.push({
      key,
      aptNm: latest.aptNm,
      lawdCd: latest.lawdCd,
      umdNm: latest.umdNm,
      buildYear: latest.buildYear,
      areaGroup: latest.areaGroup,
      dealCount: group.length,
      medianManwon: median(amounts),
      minManwon: Math.min(...amounts),
      maxManwon: Math.max(...amounts),
      latestDealDate: latest.dealDate,
    });
  }

  return candidates;
}

/** 평당가. 평형 그룹(반올림 ㎡)으로 근사 계산한다 */
function pricePerPyeongApprox(candidate: ComplexCandidate): number {
  const pyeong = candidate.areaGroup / (400 / 121);
  return pyeong > 0 ? candidate.medianManwon / pyeong : 0;
}

export function sortCandidates<T extends ComplexCandidate>(
  candidates: T[],
  sort: "median" | "pricePerPyeong" | "dealCount" | "recent",
): T[] {
  const sorted = [...candidates];
  switch (sort) {
    case "median":
      return sorted.sort((a, b) => b.medianManwon - a.medianManwon);
    case "pricePerPyeong":
      return sorted.sort((a, b) => pricePerPyeongApprox(b) - pricePerPyeongApprox(a));
    case "dealCount":
      return sorted.sort((a, b) => b.dealCount - a.dealCount);
    default:
      return sorted.sort((a, b) => b.latestDealDate.getTime() - a.latestDealDate.getTime());
  }
}
