/**
 * 국토교통부 아파트 매매 실거래가 API.
 *
 * https://www.data.go.kr/data/15126469/openapi.do
 *
 * 이 파일 하나에 요청·파싱을 전부 격리한다. 공공데이터포털 API 는
 * 응답 포맷(필드명·에러 봉투)이 종종 문서와 미묘하게 다르므로,
 * 포맷이 바뀌면 여기만 고치면 되게 만든다.
 *
 * 서버(Route Handler)에서만 import 한다. 키를 브라우저에 노출하지 않기 위해서다.
 */
import { XMLParser } from "fast-xml-parser";

const ENDPOINT =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

/** 정상 처리는 "00". "03"은 해당 조건에 데이터가 없다는 뜻이지 에러가 아니다. */
const RESULT_CODE_NORMAL = "00";
const RESULT_CODE_NO_DATA = "03";

export interface MolitTransaction {
  aptSeq: string | null;
  aptNm: string;
  lawdCd: string;
  umdNm: string | null;
  jibun: string | null;
  roadNm: string | null;
  buildYear: number | null;
  excluUseAr: number;
  floor: number | null;
  dealAmountManwon: number;
  dealDate: Date;
  /** 계약 해제 여부. cdealType 이 채워져 있으면 해제로 본다 */
  canceled: boolean;
}

export interface FetchResult {
  transactions: MolitTransaction[];
  /** 데이터가 없는 정상 응답("03")인지, 그냥 0건인지 구분해 보여줄 때 쓴다 */
  empty: boolean;
}

export class MolitApiError extends Error {
  constructor(
    message: string,
    public readonly resultCode?: string,
  ) {
    super(message);
    this.name = "MolitApiError";
  }
}

function parseAmount(raw: unknown): number {
  // "58,000" 처럼 콤마와 공백이 섞여 온다. 숫자가 아닌 문자를 전부 걷어낸다.
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  return digits === "" ? 0 : Number.parseInt(digits, 10);
}

function parseNumberOrNull(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function textOrNull(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return s === "" ? null : s;
}

/** 항목 하나를 우리 모델로 옮긴다. 필드 하나가 이상해도 나머지는 살린다. */
function mapItem(item: Record<string, unknown>, lawdCd: string): MolitTransaction | null {
  const aptNm = textOrNull(item.aptNm);
  const excluUseAr = parseNumberOrNull(item.excluUseAr);
  const year = parseNumberOrNull(item.dealYear);
  const month = parseNumberOrNull(item.dealMonth);
  const day = parseNumberOrNull(item.dealDay);

  // 이 넷은 없으면 거래 하나를 특정할 수 없다. 이런 행은 조용히 건너뛴다.
  if (!aptNm || excluUseAr === null || year === null || month === null || day === null) {
    return null;
  }

  return {
    aptSeq: textOrNull(item.aptSeq),
    aptNm,
    lawdCd,
    umdNm: textOrNull(item.umdNm),
    jibun: textOrNull(item.jibun),
    roadNm: textOrNull(item.roadNm),
    buildYear: parseNumberOrNull(item.buildYear),
    excluUseAr,
    floor: parseNumberOrNull(item.floor),
    dealAmountManwon: parseAmount(item.dealAmount),
    dealDate: new Date(Date.UTC(year, month - 1, day)),
    // cdealType 이 채워져 있으면(보통 "해제") 취소된 거래다.
    // 정확한 표기값은 실제 응답으로 확인해야 하지만, 비어있지 않다는 사실 자체가
    // "정상 거래가 아니다"라는 신호이므로 이 판단은 값이 무엇이든 안전하다.
    canceled: textOrNull(item.cdealType) !== null,
  };
}

/**
 * XML 응답을 파싱한다.
 *
 * 봉투 구조: response > header(resultCode, resultMsg) > body > items > item(...)
 * resultCode "00" 정상, "03" 조건에 맞는 데이터 없음(에러 아님), 그 외 에러.
 * 인증 오류 등은 이 봉투 자체가 다른 모양(OpenAPI_ServiceResponse)으로 올 수 있어
 * 파싱이 실패하면 원문 일부를 담아 에러를 던진다 — 무엇이 왔는지 알아야 대응할 수 있다.
 */
export function parseMolitResponse(xml: string, lawdCd: string): FetchResult {
  // resultCode 는 "00"·"03" 처럼 앞자리 0 이 의미를 갖는 코드다.
  // parseTagValue 기본값(true)은 숫자처럼 보이는 텍스트를 자동으로 숫자로 바꿔
  // "00" 을 0 으로 만들어 버리므로 반드시 꺼야 한다.
  const parser = new XMLParser({ ignoreAttributes: true, trimValues: true, parseTagValue: false });

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new MolitApiError(`XML 로 읽을 수 없는 응답입니다: ${xml.slice(0, 200)}`);
  }

  const response = doc.response as Record<string, unknown> | undefined;
  if (!response) {
    // 인증 실패 등은 <OpenAPI_ServiceResponse> 봉투로 오는 경우가 있다.
    throw new MolitApiError(`예상하지 못한 응답 형식입니다: ${xml.slice(0, 200)}`);
  }

  const header = response.header as Record<string, unknown> | undefined;
  const resultCode = String(header?.resultCode ?? "");
  const resultMsg = String(header?.resultMsg ?? "알 수 없는 오류");

  if (resultCode === RESULT_CODE_NO_DATA) {
    return { transactions: [], empty: true };
  }
  if (resultCode !== RESULT_CODE_NORMAL) {
    throw new MolitApiError(resultMsg, resultCode);
  }

  const body = response.body as Record<string, unknown> | undefined;
  const items = body?.items as Record<string, unknown> | undefined;
  const rawItem = items?.item;

  if (!rawItem) return { transactions: [], empty: true };

  // 결과가 1건이면 배열이 아니라 객체 하나로 온다 — XML 파서의 흔한 함정이다.
  const rawList = Array.isArray(rawItem) ? rawItem : [rawItem];

  const transactions = rawList
    .map((item) => mapItem(item as Record<string, unknown>, lawdCd))
    .filter((t): t is MolitTransaction => t !== null);

  return { transactions, empty: transactions.length === 0 };
}

/**
 * 한 지역(법정동 5자리) × 한 달을 수집한다.
 * 최대 1000건까지 한 페이지로 받는다 — 개인용 트래커가 다루는 규모에서
 * 한 지역·한 달에 1000건을 넘는 경우는 사실상 없다.
 */
export async function fetchTransactions(lawdCd: string, dealYmd: string): Promise<FetchResult> {
  const key = process.env.MOLIT_API_KEY;
  if (!key) {
    throw new MolitApiError("MOLIT_API_KEY 가 설정되지 않았습니다.");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("LAWD_CD", lawdCd);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new MolitApiError(`HTTP ${res.status}: 실거래가 서버에 연결하지 못했습니다.`);
  }

  const xml = await res.text();
  return parseMolitResponse(xml, lawdCd);
}
