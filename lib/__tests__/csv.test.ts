import iconv from "iconv-lite";
import { describe, expect, it } from "vitest";
import { decodeCsvBytes, duplicateKey, parseCsv, stripBom, toCsv } from "../csv";

describe("인코딩", () => {
  it("내보낸 CSV에 BOM을 붙인다 — 없으면 엑셀에서 한글이 깨진다", () => {
    const csv = toCsv([{ nickname: "반포 25평" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("BOM이 붙은 UTF-8을 되읽는다", () => {
    const csv = toCsv([{ nickname: "반포 25평", priceManwon: 250000 }]);
    const bytes = Buffer.from(csv, "utf8");
    const decoded = decodeCsvBytes(bytes);
    expect(decoded.startsWith("﻿")).toBe(false);
    expect(decoded).toContain("반포 25평");
  });

  it("엑셀이 저장한 EUC-KR 파일을 읽는다", () => {
    const euckr = iconv.encode("별칭,가격\n반포 25평,250000\n", "euc-kr");
    const decoded = decodeCsvBytes(euckr);
    expect(decoded).toContain("반포 25평");
    expect(decoded).not.toContain("�");
  });

  it("stripBom은 BOM이 없어도 안전하다", () => {
    expect(stripBom("가나다")).toBe("가나다");
    expect(stripBom("﻿가나다")).toBe("가나다");
  });

  it("한글 CSV가 왕복한다", () => {
    const original = [{ nickname: "반포 25평 A", complexName: "래미안퍼스티지", memo: "남향, 로열층" }];
    const round = parseCsv(decodeCsvBytes(Buffer.from(toCsv(original), "utf8")));
    expect(round.rows[0].values.nickname).toBe("반포 25평 A");
    expect(round.rows[0].values.complexName).toBe("래미안퍼스티지");
    expect(round.rows[0].values.memo).toBe("남향, 로열층"); // 콤마가 든 값
  });
});

describe("parseCsv", () => {
  it("한글 헤더를 필드로 옮기고 금액 표기를 읽는다", () => {
    const { rows } = parseCsv("별칭,가격,전용면적\n반포 25평,5억8천,84.96\n");
    expect(rows[0].values).toMatchObject({
      nickname: "반포 25평",
      priceManwon: 58000,
      areaM2: 84.96,
    });
    expect(rows[0].errors).toEqual([]);
  });

  it("한 행이 잘못돼도 나머지를 살린다", () => {
    const { rows } = parseCsv(
      "별칭,가격\n정상집,5억\n오타집,비쌈\n또다른집,3억\n",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors[0]).toContain("금액으로 읽지 못했습니다");
    expect(rows[1].rowNumber).toBe(2); // 사용자에게 보여줄 행 번호
    expect(rows[2].values.priceManwon).toBe(30000);
  });

  it("별칭이 없으면 오류로 잡는다", () => {
    const { rows } = parseCsv("별칭,가격\n,5억\n");
    expect(rows[0].errors).toContain("별칭이 비어 있습니다");
  });

  it("모르는 헤더를 알려주고 무시한다", () => {
    const { rows, unknownHeaders } = parseCsv("별칭,중개사연락처\n반포,010-0000-0000\n");
    expect(unknownHeaders).toEqual(["중개사연락처"]);
    expect(rows[0].values.nickname).toBe("반포");
  });

  it("빈 칸은 값을 만들지 않는다 — 0으로 채우지 않는다", () => {
    const { rows } = parseCsv("별칭,가격,전용면적\n미정집,,\n");
    expect(rows[0].values.priceManwon).toBeUndefined();
    expect(rows[0].values.areaM2).toBeUndefined();
  });

  it("빈 파일에 예외를 던지지 않는다", () => {
    expect(() => parseCsv("")).not.toThrow();
  });
});

describe("duplicateKey", () => {
  it("링크가 있으면 링크로 판정한다", () => {
    expect(duplicateKey({ sourceUrl: "https://x.com/1", nickname: "A" })).toBe(
      duplicateKey({ sourceUrl: "https://x.com/1", nickname: "B" }),
    );
  });

  it("링크가 없으면 별칭과 단지명으로 판정한다", () => {
    expect(duplicateKey({ nickname: "반포", complexName: "래미안" })).toBe(
      duplicateKey({ nickname: "반포", complexName: "래미안" }),
    );
    expect(duplicateKey({ nickname: "반포", complexName: "래미안" })).not.toBe(
      duplicateKey({ nickname: "잠실", complexName: "래미안" }),
    );
  });
});
