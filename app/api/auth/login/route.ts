import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  configuredUsers,
  createSessionToken,
  safeEqual,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const expected = process.env.SHARED_PASSWORD;

  if (!secret || !expected) {
    return NextResponse.json(
      { error: "SHARED_PASSWORD 와 SESSION_SECRET 을 .env 에 설정해야 합니다." },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const nameInput = String(form.get("name") ?? "").trim();

  if (!safeEqual(password, expected)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    const from = String(form.get("from") ?? "");
    if (from) url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }

  // 이름 목록을 설정해 뒀다면 그 안의 값만 받는다
  const users = configuredUsers();
  const name = users.length === 0 ? nameInput || "나" : users.includes(nameInput) ? nameInput : users[0];

  const token = createSessionToken({ name, issuedAt: Date.now() }, secret);

  const from = String(form.get("from") ?? "");
  const destination = from.startsWith("/") && !from.startsWith("//") ? from : "/listings";
  const response = NextResponse.redirect(new URL(destination, request.url), { status: 303 });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
