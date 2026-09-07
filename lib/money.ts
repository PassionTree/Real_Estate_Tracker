/**
 * 금액 처리.
 *
 * 이 앱은 모든 금액을 "만원 단위 정수"로 저장한다.
 * 원 단위 실수로 다루면 5억 8천만원이 579999999.9999 가 되는 순간이 온다.
 */

/** 만원 단위 정수를 한국어 표기로. 58000 → "5억 8,000만원" */
export function formatManwon(manwon: number | null | undefined): string {
  if (manwon === null || manwon === undefined || Number.isNaN(manwon)) return "-";

  const sign = manwon < 0 ? "-" : "";
  const abs = Math.abs(Math.round(manwon));
  if (abs === 0) return "0원";

  const eok = Math.floor(abs / 10000);
  const rest = abs % 10000;

  if (eok === 0) return `${sign}${rest.toLocaleString("ko-KR")}만원`;
  if (rest === 0) return `${sign}${eok.toLocaleString("ko-KR")}억`;
  return `${sign}${eok.toLocaleString("ko-KR")}억 ${rest.toLocaleString("ko-KR")}만원`;
}

/** 목록·차트용 짧은 표기. 58000 → "5.8억" */
export function formatManwonShort(manwon: number | null | undefined): string {
  if (manwon === null || manwon === undefined || Number.isNaN(manwon)) return "-";
  const sign = manwon < 0 ? "-" : "";
  const abs = Math.abs(Math.round(manwon));
  if (abs === 0) return "0";
  if (abs < 10000) return `${sign}${abs.toLocaleString("ko-KR")}만`;
  const eok = abs / 10000;
  // 5.0억처럼 소수점이 0이면 떼어낸다
  const text = eok.toFixed(1).replace(/\.0$/, "");
  return `${sign}${text}억`;
}

/**
 * 사람이 입력한 금액 문자열을 만원 단위 정수로.
 * "5억8천" · "5.8억" · "58,000" · "5억 8000만원" 을 모두 같은 값으로 읽는다.
 * 해석할 수 없으면 null — 조용히 0으로 만들지 않는다.
 */
export function parseManwon(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  // 공백·콤마·통화 단위를 걷어낸다
  let s = String(input).replace(/[\s,]/g, "").replace(/원/g, "");
  if (s === "") return null;

  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }

  let total = 0;
  let matched = false;

  // 큰 단위부터 떼어낸다. "1억2천5백" → 10000 + 2000 + 500
  const units: [RegExp, number][] = [
    [/([\d.]+)억/, 10000],
    [/([\d.]+)천/, 1000],
    [/([\d.]+)백/, 100],
  ];
  for (const [pattern, multiplier] of units) {
    const m = s.match(pattern);
    if (m) {
      const n = Number.parseFloat(m[1]);
      if (Number.isNaN(n)) return null;
      total += n * multiplier;
      matched = true;
      s = s.replace(pattern, "");
    }
  }

  // 남은 부분은 만원 단위. "8000만" 의 만은 단위 접미사라 떼어낸다.
  s = s.replace(/만$/, "");
  if (s !== "") {
    const n = Number.parseFloat(s);
    // 숫자로 읽히지 않는 찌꺼기가 남았다면 실패로 본다
    if (Number.isNaN(n) || !/^[\d.]+$/.test(s)) return null;
    total += n;
    matched = true;
  }

  if (!matched) return null;
  return Math.round(negative ? -total : total);
}
