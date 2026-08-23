/**
 * 정책 수치 로더.
 *
 * LTV·DSR·취득세율·중개보수 요율은 자주 바뀐다.
 * 그래서 코드에 박지 않고 data/policy/*.json 에서 읽기만 하며,
 * 모든 파일은 `asOf`(기준일)와 `source`(출처 URL)를 함께 들고 있다.
 * 화면에는 값 옆에 항상 기준일과 출처를 띄운다 — 정책이 바뀌면 JSON만 고치면 된다.
 */
import acquisitionTax from "@/data/policy/acquisition-tax.json";
import brokerageFee from "@/data/policy/brokerage-fee.json";

export interface PolicySource {
  asOf: string;
  source: string;
  title: string;
  note?: string;
}

export type AcquisitionTaxPolicy = typeof acquisitionTax;
export type BrokerageFeePolicy = typeof brokerageFee;

export const acquisitionTaxPolicy: AcquisitionTaxPolicy = acquisitionTax;
export const brokerageFeePolicy: BrokerageFeePolicy = brokerageFee;

/** "2026-08" → "2026년 8월 기준" */
export function formatAsOf(asOf: string): string {
  const m = asOf.match(/^(\d{4})-(\d{2})$/);
  if (!m) return `${asOf} 기준`;
  return `${m[1]}년 ${Number(m[2])}월 기준`;
}
