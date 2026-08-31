import { describe, expect, it } from "vitest";
import { MolitApiError, parseMolitResponse } from "../molit";

function envelope(resultCode: string, resultMsg: string, itemsXml = ""): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>${resultCode}</resultCode>
    <resultMsg>${resultMsg}</resultMsg>
  </header>
  <body>
    <items>${itemsXml}</items>
    <numOfRows>1000</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>1</totalCount>
  </body>
</response>`;
}

function item(fields: Record<string, string>): string {
  const body = Object.entries(fields)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join("");
  return `<item>${body}</item>`;
}

const NORMAL_ITEM = {
  aptNm: "래미안퍼스티지",
  aptSeq: "11650-123",
  excluUseAr: "84.9562",
  dealAmount: "  58,000",
  dealYear: "2026",
  dealMonth: "7",
  dealDay: "15",
  floor: "12",
  buildYear: "2009",
  umdNm: "반포동",
  jibun: "12-3",
  roadNm: "신반포로",
};

describe("parseMolitResponse — 정상 응답", () => {
  it("정상 코드(00)면 항목을 파싱한다", () => {
    const xml = envelope("00", "NORMAL SERVICE", item(NORMAL_ITEM));
    const result = parseMolitResponse(xml, "11650");

    expect(result.empty).toBe(false);
    expect(result.transactions).toHaveLength(1);

    const t = result.transactions[0];
    expect(t.aptNm).toBe("래미안퍼스티지");
    expect(t.aptSeq).toBe("11650-123");
    expect(t.lawdCd).toBe("11650");
    expect(t.excluUseAr).toBeCloseTo(84.9562, 4);
    expect(t.dealAmountManwon).toBe(58000); // 콤마·공백 제거
    expect(t.buildYear).toBe(2009);
    expect(t.floor).toBe(12);
    expect(t.canceled).toBe(false);
  });

  it("연·월·일을 하나의 날짜로 합친다", () => {
    const xml = envelope("00", "NORMAL SERVICE", item(NORMAL_ITEM));
    const t = parseMolitResponse(xml, "11650").transactions[0];
    expect(t.dealDate.getUTCFullYear()).toBe(2026);
    expect(t.dealDate.getUTCMonth()).toBe(6); // 0-indexed → 7월
    expect(t.dealDate.getUTCDate()).toBe(15);
  });

  it("항목이 하나뿐이면 배열이 아니라 객체로 온다 — 그래도 배열로 다룬다", () => {
    // envelope() 자체가 item 하나만 넣은 케이스라 이미 이 경로를 검증한다.
    const xml = envelope("00", "NORMAL SERVICE", item(NORMAL_ITEM));
    expect(parseMolitResponse(xml, "11650").transactions).toHaveLength(1);
  });

  it("항목이 여럿이면 전부 파싱한다", () => {
    const xml = envelope(
      "00",
      "NORMAL SERVICE",
      item(NORMAL_ITEM) + item({ ...NORMAL_ITEM, aptNm: "아크로리버파크", dealAmount: "70,000" }),
    );
    const result = parseMolitResponse(xml, "11650");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.map((t) => t.aptNm)).toEqual(["래미안퍼스티지", "아크로리버파크"]);
  });

  it("계약 취소(cdealType)가 있으면 canceled 로 표시한다", () => {
    const xml = envelope("00", "NORMAL SERVICE", item({ ...NORMAL_ITEM, cdealType: "해제" }));
    expect(parseMolitResponse(xml, "11650").transactions[0].canceled).toBe(true);
  });

  it("선택 필드가 비어 있어도 필수 필드만 있으면 파싱한다", () => {
    const minimal = {
      aptNm: "이름만있는단지",
      excluUseAr: "59.9",
      dealAmount: "30000",
      dealYear: "2026",
      dealMonth: "1",
      dealDay: "1",
    };
    const xml = envelope("00", "NORMAL SERVICE", item(minimal));
    const t = parseMolitResponse(xml, "11650").transactions[0];
    expect(t.aptSeq).toBeNull();
    expect(t.buildYear).toBeNull();
    expect(t.floor).toBeNull();
  });

  it("필수 필드가 빠진 항목은 조용히 건너뛴다 — 나머지는 살린다", () => {
    const broken = { aptNm: "깨진행", dealAmount: "10000" }; // excluUseAr·날짜 없음
    const xml = envelope("00", "NORMAL SERVICE", item(broken) + item(NORMAL_ITEM));
    const result = parseMolitResponse(xml, "11650");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].aptNm).toBe("래미안퍼스티지");
  });
});

describe("parseMolitResponse — 데이터 없음과 에러", () => {
  it("resultCode 03은 에러가 아니라 빈 결과다", () => {
    const xml = envelope("03", "NO_DATA_ERROR");
    const result = parseMolitResponse(xml, "11650");
    expect(result.empty).toBe(true);
    expect(result.transactions).toEqual([]);
  });

  it("그 외 코드는 에러로 던진다", () => {
    const xml = envelope("99", "SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
    expect(() => parseMolitResponse(xml, "11650")).toThrow(MolitApiError);
    try {
      parseMolitResponse(xml, "11650");
    } catch (e) {
      expect((e as MolitApiError).resultCode).toBe("99");
      expect((e as MolitApiError).message).toContain("SERVICE_KEY");
    }
  });

  it("items 자체가 없어도 죽지 않는다", () => {
    const xml = `<response><header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header><body></body></response>`;
    expect(parseMolitResponse(xml, "11650")).toEqual({ transactions: [], empty: true });
  });

  it("XML 이 아예 아니면 명확한 에러를 던진다", () => {
    expect(() => parseMolitResponse("<<not xml>>>", "11650")).toThrow(MolitApiError);
  });

  it("예상 못한 봉투(response 없음)도 에러로 잡는다 — 인증 실패 등", () => {
    const xml = `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</errMsg></cmmMsgHeader></OpenAPI_ServiceResponse>`;
    expect(() => parseMolitResponse(xml, "11650")).toThrow(MolitApiError);
  });
});
