/**
 * 외부 서비스 딥링크.
 *
 * 시세지도·경사도·일조량·학군·상권은 호갱노노가, 여러 단지 시세 비교는 아실이,
 * 정밀 세금계산은 부동산계산기.com 이 이미 압도적으로 잘 한다.
 * 그걸 다시 만드는 대신 매물에서 한 번에 건너갈 수 있게 한다.
 *
 * 각 서비스가 URL 형식을 바꾸면 이 파일만 고치면 된다.
 */

export interface DeepLink {
  label: string;
  url: string;
  description: string;
}

function q(value: string): string {
  return encodeURIComponent(value.trim());
}

/** 매물 상세에서 띄우는 링크들. 검색어로 쓸 만한 값이 없으면 그 링크는 내보내지 않는다. */
export function listingDeepLinks(listing: {
  complexName?: string | null;
  address?: string | null;
  priceManwon?: number | null;
}): DeepLink[] {
  const term = listing.complexName?.trim() || listing.address?.trim() || "";
  const links: DeepLink[] = [];

  if (term) {
    links.push({
      label: "호갱노노",
      url: `https://hogangnono.com/search/${q(term)}`,
      description: "실거래가 시세지도, 경사도, 일조량, 학군, 상권",
    });
    links.push({
      label: "네이버지도",
      url: `https://map.naver.com/p/search/${q(term)}`,
      description: "위치, 로드뷰, 주변 시설",
    });
    links.push({
      label: "네이버부동산",
      url: `https://land.naver.com/search/result.naver?query=${q(term)}`,
      description: "현재 나와 있는 매물 호가",
    });
    links.push({
      label: "아실",
      url: "https://asil.kr/",
      description: "여러 단지 시세를 한 그래프에 겹쳐 비교",
    });
  }

  links.push({
    label: "인터넷등기소",
    url: "https://www.iros.go.kr/",
    description: "등기부등본 열람 — 근저당·가압류 확인 (700원)",
  });

  if (listing.priceManwon) {
    links.push({
      label: "부동산계산기",
      url: "https://xn--989a00af8jnslv3dba.com/%EC%B7%A8%EB%93%9D%EC%84%B8",
      description: "취득세·중개보수·양도세 정밀 계산",
    });
  }

  return links;
}

/**
 * 링크 허브.
 *
 * "부동산의 모든 것을 한 사이트에서" 라는 목표를, 자체 기능이 붙기 전까지
 * 엄선된 링크 모음으로 먼저 달성한다. 앞으로 하나씩 자체 기능으로 대체한다.
 */
export interface HubSection {
  slug: "finance" | "policy" | "market";
  title: string;
  intro: string;
  /** 이 영역을 나중에 무엇으로 대체할 계획인지 */
  roadmap: string[];
  links: DeepLink[];
}

export const HUB_SECTIONS: HubSection[] = [
  {
    slug: "finance",
    title: "대출 · 자금",
    intro:
      "총소요자금 개산은 아래에서 바로 해볼 수 있다. 정밀한 세금·대출 계산은 이미 잘 만들어진 곳으로 넘긴다.",
    roadmap: [
      "LTV / DTI / DSR 한도 계산",
      "원리금균등 · 원금균등 상환 스케줄",
      "자기자본 + 주담대 + 신용대출 조합별 시나리오 비교",
    ],
    links: [
      {
        label: "부동산계산기.com",
        url: "https://xn--989a00af8jnslv3dba.com/",
        description: "취득세 · 중개보수 · DSR · 양도세 · 보유세",
      },
      {
        label: "주택도시기금",
        url: "https://nhuf.molit.go.kr/",
        description: "디딤돌 · 버팀목 등 정책대출 조건",
      },
      {
        label: "금융감독원 금융상품통합비교공시",
        url: "https://finlife.fss.or.kr/",
        description: "은행별 주택담보대출 금리 비교",
      },
    ],
  },
  {
    slug: "policy",
    title: "정책 · 제도",
    intro: "규제와 세제는 자주 바뀐다. 원문을 보는 습관이 안전하다.",
    roadmap: [
      "규제지역 · LTV · DSR 규제 정리 (기준일과 출처 포함)",
      "취득세 · 보유세 · 양도세 아카이브",
      "청약 제도와 자격 요건",
    ],
    links: [
      {
        label: "대한민국 정책브리핑",
        url: "https://www.korea.kr/",
        description: "부동산 대책 원문과 해설",
      },
      {
        label: "국토교통부",
        url: "https://www.molit.go.kr/",
        description: "주택정책 보도자료",
      },
      {
        label: "청약홈",
        url: "https://www.applyhome.co.kr/",
        description: "청약 일정 · 경쟁률 · 자격 확인",
      },
      {
        label: "인터넷등기소",
        url: "https://www.iros.go.kr/",
        description: "등기부등본 열람 · 발급",
      },
      {
        label: "전세사기 예방 체크리스트",
        url: "https://www.korea.kr/multi/visualNewsView.do?newsId=148905628",
        description: "계약 단계별로 확인할 것들",
      },
    ],
  },
  {
    slug: "market",
    title: "시세 · 시장",
    intro:
      "모르는 매물을 찾고 시세 흐름을 읽는 일은 아래 서비스들이 훨씬 잘 한다. 이 앱은 거기서 고른 매물을 기록한다.",
    roadmap: [
      "국토부 실거래가 API 연동 — 호가 대비 괴리율",
      "선택한 매물들의 실거래가 추이 겹쳐보기",
      "지역별 시세 추이 (입주물량 · 매수심리는 계속 외부에 위임)",
    ],
    links: [
      {
        label: "호갱노노",
        url: "https://hogangnono.com/",
        description: "실거래가 시세지도, 경사도, 3D 일조량, 학군, 입주물량",
      },
      {
        label: "아실",
        url: "https://asil.kr/",
        description: "여러 단지 시세 비교, 매물 증감, 최고가 순위",
      },
      {
        label: "부동산지인",
        url: "https://aptgin.com/",
        description: "수요 · 입주물량 분석",
      },
      {
        label: "국토부 실거래가 공개시스템",
        url: "https://rt.molit.go.kr/",
        description: "원본 실거래 신고 자료",
      },
      {
        label: "한국부동산원",
        url: "https://www.reb.or.kr/",
        description: "공식 가격지수 통계",
      },
    ],
  },
];

export function hubSection(slug: HubSection["slug"]): HubSection {
  const section = HUB_SECTIONS.find((s) => s.slug === slug);
  if (!section) throw new Error(`알 수 없는 허브 섹션: ${slug}`);
  return section;
}
