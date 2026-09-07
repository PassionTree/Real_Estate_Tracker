import { describe, expect, it } from "vitest";
import { calculateAcquisitionTax, calculateBrokerageFee, calculateTotalCost } from "../cost";
import { acquisitionTaxPolicy, brokerageFeePolicy, formatAsOf } from "../policy";

// 실제 세율이 바뀌어도 로직 테스트가 깨지지 않도록, 구간 로직은 고정 픽스처로 검증한다.
const fixture = {
  ...acquisitionTaxPolicy,
  under6eok: { maxManwon: 60000, rate: 0.01 },
  over9eok: { minManwon: 90000, rate: 0.03 },
  localEducationTaxRatio: 0.1,
  ruralSpecialTax: { rate: 0.002, exemptAreaM2: 85, note: "" },
};

describe("calculateAcquisitionTax — 구간 경계", () => {
  it("6억 이하는 1%", () => {
    expect(calculateAcquisitionTax(50000, 59, fixture).rate).toBeCloseTo(0.01, 10);
    expect(calculateAcquisitionTax(60000, 59, fixture).rate).toBeCloseTo(0.01, 10);
  });

  it("9억 초과는 3%", () => {
    expect(calculateAcquisitionTax(90001, 59, fixture).rate).toBeCloseTo(0.03, 10);
    expect(calculateAcquisitionTax(150000, 59, fixture).rate).toBeCloseTo(0.03, 10);
  });

  it("6억~9억 구간식이 양 끝에서 이어진다", () => {
    // 경계에서 튀면 구간식이 틀린 것이다
    expect(calculateAcquisitionTax(60001, 59, fixture).rate).toBeCloseTo(0.01, 5);
    expect(calculateAcquisitionTax(90000, 59, fixture).rate).toBeCloseTo(0.03, 10);
  });

  it("6억~9억 구간 중간값", () => {
    // 7.5억 → (7.5 × 2/3 − 3) = 2% 
    expect(calculateAcquisitionTax(75000, 59, fixture).rate).toBeCloseTo(0.02, 10);
  });

  it("지방교육세는 취득세의 10%", () => {
    const r = calculateAcquisitionTax(60000, 59, fixture);
    expect(r.acquisitionManwon).toBeCloseTo(600, 6);
    expect(r.localEducationManwon).toBeCloseTo(60, 6);
  });

  it("농어촌특별세는 전용 85㎡ 초과에만 붙는다", () => {
    expect(calculateAcquisitionTax(60000, 84.96, fixture).ruralSpecialManwon).toBe(0);
    expect(calculateAcquisitionTax(60000, 85, fixture).ruralSpecialManwon).toBe(0);
    expect(calculateAcquisitionTax(60000, 85.01, fixture).ruralSpecialManwon).toBeCloseTo(120, 6);
  });

  it("면적을 모르면 농특세를 붙이지 않는다 — 개산을 과대계상하지 않는다", () => {
    expect(calculateAcquisitionTax(60000, null, fixture).ruralSpecialManwon).toBe(0);
  });

  it("가격이 없으면 전부 0", () => {
    expect(calculateAcquisitionTax(0, 100, fixture).totalManwon).toBe(0);
  });
});

describe("calculateBrokerageFee", () => {
  it("구간별 요율을 적용한다", () => {
    // 5억 매매 → 2~9억 구간 0.4%
    expect(calculateBrokerageFee(50000, "sale", brokerageFeePolicy)).toBeCloseTo(200, 6);
    // 10억 매매 → 9~12억 구간 0.5%
    expect(calculateBrokerageFee(100000, "sale", brokerageFeePolicy)).toBeCloseTo(500, 6);
    // 20억 매매 → 15억 이상 0.7%
    expect(calculateBrokerageFee(200000, "sale", brokerageFeePolicy)).toBeCloseTo(1400, 6);
  });

  it("저가 구간의 한도를 적용한다", () => {
    // 4천만원 × 0.6% = 24만원 (한도 25만원 미만이라 그대로)
    expect(calculateBrokerageFee(4000, "sale", brokerageFeePolicy)).toBeCloseTo(24, 6);
    // 1억 × 0.5% = 50만원이지만 한도 80만원 이내
    expect(calculateBrokerageFee(10000, "sale", brokerageFeePolicy)).toBeCloseTo(50, 6);
    // 4천9백만원 × 0.6% = 29.4만원 → 한도 25만원으로 잘린다
    expect(calculateBrokerageFee(4900, "sale", brokerageFeePolicy)).toBe(25);
  });

  it("가격이 없으면 0", () => {
    expect(calculateBrokerageFee(0, "sale", brokerageFeePolicy)).toBe(0);
  });
});

describe("calculateTotalCost", () => {
  it("매매가에 부대비용을 더한다", () => {
    const r = calculateTotalCost({ priceManwon: 50000, areaM2: 84.96, movingManwon: 500 });
    expect(r.acquisitionTax.totalManwon).toBeCloseTo(550, 6); // 500 + 50, 농특세 없음
    expect(r.brokerageManwon).toBeCloseTo(200, 6);
    expect(r.legalManwon).toBe(60);
    expect(r.totalManwon).toBeCloseTo(50000 + 550 + 200 + 60 + 500, 6);
  });

  it("대출과 승계보증금을 빼서 실제 필요한 현금을 낸다", () => {
    const r = calculateTotalCost({
      priceManwon: 50000,
      areaM2: 84.96,
      loanManwon: 30000,
      assumedDepositManwon: 5000,
    });
    expect(r.ownCashManwon).toBeCloseTo(r.totalManwon - 35000, 6);
  });

  it("전세는 취득세와 법무비가 붙지 않는다", () => {
    const r = calculateTotalCost({ priceManwon: 50000, areaM2: 84.96, dealType: "전세" });
    expect(r.acquisitionTax.totalManwon).toBe(0);
    expect(r.legalManwon).toBe(0);
    // 전세 5억 → 6억 미만 구간 0.3%
    expect(r.brokerageManwon).toBeCloseTo(150, 6);
  });
});

describe("정책 메타데이터", () => {
  it("모든 정책 파일이 기준일과 출처를 들고 있다", () => {
    for (const policy of [acquisitionTaxPolicy, brokerageFeePolicy]) {
      expect(policy.asOf).toMatch(/^\d{4}-\d{2}$/);
      expect(policy.source).toMatch(/^https?:\/\//);
    }
  });

  it("기준일을 한국어로 표기한다", () => {
    expect(formatAsOf("2026-08")).toBe("2026년 8월 기준");
  });
});
