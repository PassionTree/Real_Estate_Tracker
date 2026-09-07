/**
 * 총소요자금 개산.
 *
 * 정밀 계산은 부동산계산기.com 이 이미 정확하게 한다. 세법 개정을 따라다니는 부담을
 * 지는 대신, 여기서는 "이 집을 사려면 현금이 대충 얼마 더 필요한가"만 답한다.
 * 화면에는 항상 개산임을 밝히고 정밀 계산 링크를 함께 둔다.
 */
import { type AcquisitionTaxPolicy, type BrokerageFeePolicy, acquisitionTaxPolicy, brokerageFeePolicy } from "./policy";

export interface AcquisitionTaxResult {
  /** 취득세 본세율 (0.01 = 1%) */
  rate: number;
  acquisitionManwon: number;
  localEducationManwon: number;
  ruralSpecialManwon: number;
  totalManwon: number;
}

/**
 * 주택 취득세 (유상취득 · 1주택 기준).
 * 6억 이하 1%, 9억 초과 3%, 그 사이는 (취득가액(억) × 2/3 − 3)% 로 이어진다.
 */
export function calculateAcquisitionTax(
  priceManwon: number,
  areaM2: number | null | undefined,
  policy: AcquisitionTaxPolicy = acquisitionTaxPolicy,
): AcquisitionTaxResult {
  const empty = {
    rate: 0,
    acquisitionManwon: 0,
    localEducationManwon: 0,
    ruralSpecialManwon: 0,
    totalManwon: 0,
  };
  if (!priceManwon || priceManwon <= 0) return empty;

  const { under6eok, over9eok, localEducationTaxRatio, ruralSpecialTax } = policy;

  let rate: number;
  if (priceManwon <= under6eok.maxManwon) {
    rate = under6eok.rate;
  } else if (priceManwon > over9eok.minManwon) {
    rate = over9eok.rate;
  } else {
    // 6억 초과 9억 이하 — 억 단위로 환산해 선형 구간식을 적용한다
    const eok = priceManwon / 10000;
    rate = ((eok * 2) / 3 - 3) / 100;
  }

  const acquisitionManwon = priceManwon * rate;
  const localEducationManwon = acquisitionManwon * localEducationTaxRatio;

  // 농어촌특별세는 전용면적 85㎡ 초과일 때만 붙는다.
  // 면적을 모르면 붙이지 않는다 — 개산을 과대계상하지 않기 위해서다.
  const overArea = typeof areaM2 === "number" && areaM2 > ruralSpecialTax.exemptAreaM2;
  const ruralSpecialManwon = overArea ? priceManwon * ruralSpecialTax.rate : 0;

  return {
    rate,
    acquisitionManwon,
    localEducationManwon,
    ruralSpecialManwon,
    totalManwon: acquisitionManwon + localEducationManwon + ruralSpecialManwon,
  };
}

/** 중개보수 상한. 실제로는 이 안에서 협의하므로 "최대 이만큼"으로 읽어야 한다. */
export function calculateBrokerageFee(
  priceManwon: number,
  kind: "sale" | "lease" = "sale",
  policy: BrokerageFeePolicy = brokerageFeePolicy,
): number {
  if (!priceManwon || priceManwon <= 0) return 0;

  const brackets = policy[kind];
  const bracket =
    brackets.find((b) => b.underManwon !== null && priceManwon < b.underManwon) ??
    brackets[brackets.length - 1];

  const fee = priceManwon * bracket.rate;
  return bracket.capManwon !== null ? Math.min(fee, bracket.capManwon) : fee;
}

export interface TotalCostInput {
  priceManwon: number;
  areaM2?: number | null;
  dealType?: string;
  /** 법무사 비용. 모르면 기본값을 쓴다 */
  legalManwon?: number;
  /** 이사비·수리비 등 사용자가 직접 넣는 몫 */
  movingManwon?: number;
  /** 주택담보대출 등 조달 예정액 */
  loanManwon?: number;
  /** 승계하는 전세보증금 */
  assumedDepositManwon?: number;
}

export interface TotalCostResult {
  priceManwon: number;
  acquisitionTax: AcquisitionTaxResult;
  brokerageManwon: number;
  legalManwon: number;
  movingManwon: number;
  /** 매매가 + 부대비용 */
  totalManwon: number;
  /** 총소요자금에서 대출·승계보증금을 뺀, 실제로 있어야 하는 현금 */
  ownCashManwon: number;
}

const DEFAULT_LEGAL_MANWON = 60;

export function calculateTotalCost(input: TotalCostInput): TotalCostResult {
  const {
    priceManwon,
    areaM2,
    dealType = "매매",
    legalManwon = DEFAULT_LEGAL_MANWON,
    movingManwon = 0,
    loanManwon = 0,
    assumedDepositManwon = 0,
  } = input;

  const isSale = dealType === "매매";

  // 전월세는 취득세가 없다
  const acquisitionTax = isSale
    ? calculateAcquisitionTax(priceManwon, areaM2)
    : calculateAcquisitionTax(0, areaM2);

  const brokerageManwon = calculateBrokerageFee(priceManwon, isSale ? "sale" : "lease");
  const legal = isSale ? legalManwon : 0;

  const totalManwon =
    priceManwon + acquisitionTax.totalManwon + brokerageManwon + legal + movingManwon;

  return {
    priceManwon,
    acquisitionTax,
    brokerageManwon,
    legalManwon: legal,
    movingManwon,
    totalManwon,
    ownCashManwon: totalManwon - loanManwon - assumedDepositManwon,
  };
}
