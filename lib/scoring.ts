/**
 * 가중치 스코어링.
 *
 * 이 파일의 핵심 규칙은 한 줄이다 — **미평가 항목은 0점이 아니라 계산에서 제외한다.**
 * 0점으로 치면 일부만 평가한 매물이 부당하게 하위로 밀리고,
 * 그러면 아무도 점수를 안 쓰게 되고, 그러면 이 기능 전체가 죽는다.
 * 부분 입력은 예외가 아니라 기본값이다.
 */

export interface Criterion {
  id: string;
  name: string;
  weight: number; // 1~5 중요도
  isDealBreaker: boolean;
}

export interface Score {
  criterionId: string;
  value: number; // 1~5
}

export interface ScoreResult {
  /** 0~100 정규화 점수. 평가된 항목이 하나도 없으면 null */
  score: number | null;
  /** 평가된 가중치 비율 0~1. "3/6 평가됨"의 신뢰도 표시용 */
  coverage: number;
  evaluatedCount: number;
  totalCount: number;
  /** 절대조건을 위반한 항목 이름들 */
  dealBreakerViolations: string[];
}

/** 절대조건은 2점 이하를 위반으로 본다 */
export const DEAL_BREAKER_THRESHOLD = 2;

export function calculateScore(criteria: Criterion[], scores: Score[]): ScoreResult {
  const byId = new Map(scores.map((s) => [s.criterionId, s.value]));

  let weightedSum = 0;
  let weightSum = 0;
  let evaluatedCount = 0;
  let totalWeight = 0;
  const dealBreakerViolations: string[] = [];

  for (const criterion of criteria) {
    const weight = Math.max(0, criterion.weight);
    totalWeight += weight;

    const value = byId.get(criterion.id);
    if (value === undefined || Number.isNaN(value)) continue; // ← 미평가는 제외

    evaluatedCount += 1;
    weightedSum += weight * value;
    weightSum += weight;

    if (criterion.isDealBreaker && value <= DEAL_BREAKER_THRESHOLD) {
      dealBreakerViolations.push(criterion.name);
    }
  }

  const coverage = totalWeight > 0 ? weightSum / totalWeight : 0;

  // 평가된 항목이 없거나 가중치가 전부 0이면 점수를 만들지 않는다.
  // 0점과 "아직 모름"은 다른 상태다.
  if (evaluatedCount === 0 || weightSum === 0) {
    return {
      score: null,
      coverage,
      evaluatedCount,
      totalCount: criteria.length,
      dealBreakerViolations,
    };
  }

  const raw = weightedSum / weightSum; // 1~5
  const score = ((raw - 1) / 4) * 100; // 0~100

  return {
    score,
    coverage,
    evaluatedCount,
    totalCount: criteria.length,
    dealBreakerViolations,
  };
}

/**
 * 점수 기준 정렬용 키.
 * 절대조건 위반은 뒤로 보내되 목록에서 지우지는 않는다 — 조건은 바뀌기 때문이다.
 * 미평가(null)는 항상 맨 뒤.
 */
export function sortKey(result: ScoreResult): number {
  if (result.score === null) return -2;
  if (result.dealBreakerViolations.length > 0) return -1;
  return result.score;
}
