import { describe, expect, it } from "vitest";
import { M2_PER_PYEONG, formatPyeong, m2ToPyeong, monthlyHousingCost, pricePerPyeong, pyeongToM2 } from "../area";

describe("면적 변환", () => {
  it("1평은 400/121 ㎡", () => {
    expect(M2_PER_PYEONG).toBeCloseTo(3.305785, 6);
  });

  it("국민평형 84.96㎡는 약 25.7평", () => {
    expect(m2ToPyeong(84.96)).toBeCloseTo(25.7, 1);
    expect(formatPyeong(84.96)).toBe("25.7평");
  });

  it("변환이 왕복한다", () => {
    expect(pyeongToM2(m2ToPyeong(59.99)!)).toBeCloseTo(59.99, 6);
  });

  it("빈 값을 통과시킨다", () => {
    expect(m2ToPyeong(null)).toBeNull();
    expect(formatPyeong(undefined)).toBe("-");
  });
});

describe("pricePerPyeong", () => {
  it("만원/평을 낸다", () => {
    // 84.96㎡ ≒ 25.7012평, 10억 → 약 3,891만원/평
    expect(pricePerPyeong(100000, 84.96)).toBeCloseTo(3890.9, 0);
  });

  it("0으로 나누지 않는다", () => {
    expect(pricePerPyeong(100000, 0)).toBeNull();
    expect(pricePerPyeong(null, 84.96)).toBeNull();
    expect(pricePerPyeong(100000, null)).toBeNull();
  });
});

describe("monthlyHousingCost", () => {
  it("월세와 관리비를 합산한다", () => {
    expect(monthlyHousingCost({ monthlyRentManwon: 80, maintenanceManwon: 15 })).toBe(95);
  });

  it("한쪽만 있어도 합산한다", () => {
    expect(monthlyHousingCost({ maintenanceManwon: 15 })).toBe(15);
  });

  it("둘 다 없으면 null", () => {
    expect(monthlyHousingCost({})).toBeNull();
  });
});
