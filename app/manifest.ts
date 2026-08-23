import type { MetadataRoute } from "next";

/**
 * 임장은 현장에서 폰으로 기록한다.
 * 홈 화면에 아이콘으로 두고 바로 열 수 있어야 실제로 쓰게 된다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "부동산 트래커",
    short_name: "부동산",
    description: "관심 매물, 자금 계획, 부동산 정책을 한 곳에서",
    start_url: "/listings",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#2f5d50",
    lang: "ko",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
