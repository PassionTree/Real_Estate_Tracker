/**
 * 인증 가드.
 *
 * Next.js 16 에서 middleware 규약은 proxy 로 이름이 바뀌었고 런타임은 nodejs 다.
 * 덕분에 여기서 node:crypto 로 세션 서명을 그대로 검증할 수 있다.
 */
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;

  // 키가 없으면 서명을 검증할 방법이 없다. 통과시키는 대신 설정하라고 막는다.
  if (!secret) {
    if (request.nextUrl.pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token, secret)) return NextResponse.next();

  // 로그인 후 원래 가려던 곳으로 되돌려준다
  const loginUrl = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/" && !from.startsWith("/login")) loginUrl.searchParams.set("from", from);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // 로그인·설정 안내와 정적 자산은 가드에서 뺀다.
    // 여기서 정적 파일을 막으면 로그인 화면의 CSS 까지 함께 막힌다.
    "/((?!login|setup|api/auth|manifest.webmanifest|favicon.ico|_next/static|_next/image).*)",
  ],
};
