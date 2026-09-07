/**
 * CSV 가져오기·내보내기.
 *
 * 이 앱에서 CSV 는 세 가지 역할을 한다 — 엑셀에서 옮겨오는 통로,
 * 엑셀로 되돌아갈 수 있는 탈출구, 그리고 사실상의 백업.
 *
 * 한글 CSV 는 인코딩에서 깨진다. 엑셀이 저장한 파일은 대개 EUC-KR(CP949) 이고,
 * 엑셀이 UTF-8 파일을 제대로 열려면 BOM 이 있어야 한다.
 * 한 번 깨져 보이면 사용자는 이 기능을 다시 쓰지 않는다.
 *
 * Buffer 와 iconv-lite 를 쓰므로 서버(API 라우트)에서만 import 한다.
 */
import iconv from "iconv-lite";
import Papa from "papaparse";
import { parseManwon } from "./money";

/** 한글 헤더 ↔ 필드명. 엑셀에서 사람이 직접 열어볼 파일이라 헤더는 한국어로 쓴다. */
export const CSV_COLUMNS: { header: string; field: string; kind: "money" | "number" | "text" }[] = [
  { header: "별칭", field: "nickname", kind: "text" },
  { header: "거래유형", field: "dealType", kind: "text" },
  { header: "매물유형", field: "propertyType", kind: "text" },
  { header: "상태", field: "status", kind: "text" },
  { header: "가격", field: "priceManwon", kind: "money" },
  { header: "보증금", field: "depositManwon", kind: "money" },
  { header: "월세", field: "monthlyRentManwon", kind: "money" },
  { header: "관리비", field: "maintenanceManwon", kind: "money" },
  { header: "주소", field: "address", kind: "text" },
  { header: "법정동코드", field: "lawdCd", kind: "text" },
  { header: "단지명", field: "complexName", kind: "text" },
  { header: "동", field: "dong", kind: "text" },
  { header: "호", field: "ho", kind: "text" },
  { header: "전용면적", field: "areaM2", kind: "number" },
  { header: "공급면적", field: "supplyAreaM2", kind: "number" },
  { header: "층", field: "floor", kind: "number" },
  { header: "총층", field: "totalFloors", kind: "number" },
  { header: "준공년도", field: "builtYear", kind: "number" },
  { header: "세대수", field: "householdCount", kind: "number" },
  { header: "방", field: "rooms", kind: "number" },
  { header: "욕실", field: "bathrooms", kind: "number" },
  { header: "향", field: "direction", kind: "text" },
  { header: "주차", field: "parking", kind: "text" },
  { header: "통근시간", field: "commuteMinutes", kind: "number" },
  { header: "태그", field: "tags", kind: "text" },
  { header: "링크", field: "sourceUrl", kind: "text" },
  { header: "메모", field: "memo", kind: "text" },
];

const BOM = "﻿";

export type CsvRow = Record<string, unknown>;

/**
 * 내보내기. 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙인다.
 */
export function toCsv(rows: CsvRow[]): string {
  const data = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const { header, field } of CSV_COLUMNS) {
      const value = row[field];
      out[header] = value === null || value === undefined ? "" : String(value);
    }
    return out;
  });

  return BOM + Papa.unparse(data, { columns: CSV_COLUMNS.map((c) => c.header) });
}

/**
 * 업로드된 바이트를 문자열로.
 * UTF-8 로 읽어보고 깨진 문자(U+FFFD)가 나오면 EUC-KR 로 다시 읽는다.
 * 엑셀에서 "CSV로 저장"한 파일이 대개 이 경로로 들어온다.
 */
export function decodeCsvBytes(bytes: Uint8Array | Buffer): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return stripBom(utf8);

  try {
    return stripBom(iconv.decode(Buffer.from(bytes), "euc-kr"));
  } catch {
    return stripBom(utf8);
  }
}

export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

export interface ParsedRow {
  /** 1부터 세는 데이터 행 번호(헤더 제외). 오류 리포트에 그대로 보여준다 */
  rowNumber: number;
  values: Record<string, unknown>;
  errors: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  /** 알아보지 못한 헤더. 사용자에게 무시했다고 알려준다 */
  unknownHeaders: string[];
}

/**
 * 파싱. 한 행이 잘못돼도 나머지는 살린다 —
 * 30행짜리 파일이 3행 오타 하나로 통째로 거부되면 아무도 다시 시도하지 않는다.
 */
export function parseCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(stripBom(text), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const byHeader = new Map(CSV_COLUMNS.map((c) => [c.header, c]));
  const seenHeaders = parsed.meta.fields ?? [];
  const unknownHeaders = seenHeaders.filter((h) => h !== "" && !byHeader.has(h));

  const rows: ParsedRow[] = parsed.data.map((raw, index) => {
    const values: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const [header, rawValue] of Object.entries(raw)) {
      const column = byHeader.get(header.trim());
      if (!column) continue;

      const text = (rawValue ?? "").trim();
      if (text === "") continue;

      if (column.kind === "money") {
        const parsedMoney = parseManwon(text);
        if (parsedMoney === null) {
          errors.push(`${header}: "${text}" 을(를) 금액으로 읽지 못했습니다`);
          continue;
        }
        values[column.field] = parsedMoney;
      } else if (column.kind === "number") {
        const n = Number(text.replace(/,/g, ""));
        if (!Number.isFinite(n)) {
          errors.push(`${header}: "${text}" 을(를) 숫자로 읽지 못했습니다`);
          continue;
        }
        values[column.field] = n;
      } else {
        values[column.field] = text;
      }
    }

    if (!values.nickname) {
      errors.push("별칭이 비어 있습니다");
    }

    return { rowNumber: index + 1, values, errors };
  });

  return { rows, unknownHeaders };
}

/**
 * 중복 판정.
 * 링크가 같으면 확실히 같은 매물이고, 없으면 별칭+단지명으로 본다.
 */
export function duplicateKey(row: { sourceUrl?: unknown; nickname?: unknown; complexName?: unknown }): string {
  const url = typeof row.sourceUrl === "string" ? row.sourceUrl.trim() : "";
  if (url) return `url:${url}`;
  const nickname = typeof row.nickname === "string" ? row.nickname.trim() : "";
  const complex = typeof row.complexName === "string" ? row.complexName.trim() : "";
  return `name:${nickname}|${complex}`;
}
