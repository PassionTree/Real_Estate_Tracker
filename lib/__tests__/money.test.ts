import { describe, expect, it } from "vitest";
import { formatManwon, formatManwonShort, parseManwon } from "../money";

describe("formatManwon", () => {
  it("억과 만원을 함께 표기한다", () => {
    expect(formatManwon(58000)).toBe("5억 8,000만원");
  });

  it("나머지가 없으면 억만 표기한다", () => {
    expect(formatManwon(80000)).toBe("8억");
    expect(formatManwon(100000)).toBe("10억");
  });

  it("1억 미만은 만원만 표기한다", () => {
    expect(formatManwon(5000)).toBe("5,000만원");
  });

  it("0과 빈 값을 구분해서 다룬다", () => {
    expect(formatManwon(0)).toBe("0원");
    expect(formatManwon(null)).toBe("-");
    expect(formatManwon(undefined)).toBe("-");
    expect(formatManwon(Number.NaN)).toBe("-");
  });

  it("음수를 표기한다", () => {
    expect(formatManwon(-5000)).toBe("-5,000만원");
  });
});

describe("formatManwonShort", () => {
  it("소수점 한 자리 억으로 줄인다", () => {
    expect(formatManwonShort(58000)).toBe("5.8억");
    expect(formatManwonShort(80000)).toBe("8억");
    expect(formatManwonShort(5000)).toBe("5,000만");
  });
});

describe("parseManwon", () => {
  it("같은 금액의 여러 표기를 같은 값으로 읽는다", () => {
    expect(parseManwon("58000")).toBe(58000);
    expect(parseManwon("58,000")).toBe(58000);
    expect(parseManwon("5억8천")).toBe(58000);
    expect(parseManwon("5.8억")).toBe(58000);
    expect(parseManwon("5억 8000")).toBe(58000);
    expect(parseManwon("5억 8000만원")).toBe(58000);
  });

  it("억·천·백 단위를 조합한다", () => {
    expect(parseManwon("5억")).toBe(50000);
    expect(parseManwon("8천")).toBe(8000);
    expect(parseManwon("1억2천5백")).toBe(12500);
    expect(parseManwon("5천만원")).toBe(5000);
  });

  it("읽을 수 없으면 0이 아니라 null을 낸다", () => {
    expect(parseManwon("")).toBeNull();
    expect(parseManwon("  ")).toBeNull();
    expect(parseManwon("비싼집")).toBeNull();
    expect(parseManwon("5억쯤")).toBeNull();
    expect(parseManwon(null)).toBeNull();
    expect(parseManwon(undefined)).toBeNull();
  });

  it("음수를 읽는다", () => {
    expect(parseManwon("-5000")).toBe(-5000);
  });

  it("표기와 파싱이 왕복한다", () => {
    for (const value of [0, 5000, 58000, 80000, 123456]) {
      expect(parseManwon(formatManwon(value))).toBe(value);
    }
  });
});
