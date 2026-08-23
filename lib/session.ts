/**
 * 공유 비밀번호 세션.
 *
 * 부부·가족이 함께 쓰는 앱이라 회원가입 시스템은 과하다.
 * 비밀번호 하나를 공유하고, 로그인할 때 "누구인지"만 골라
 * 메모·별점의 작성자를 남긴다.
 *
 * 쿠키는 HMAC 으로 서명만 한다(암호화가 아니다). 안에 든 것은 이름과 발급시각뿐이라
 * 노출돼도 문제가 없고, 서명이 있으니 위조는 안 된다.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ret_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

export interface SessionPayload {
  name: string;
  issuedAt: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(data).digest());
}

/** 길이가 달라도 예외 없이 false 를 내는 상수시간 비교 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // 길이가 다르면 어차피 불일치지만, 조기 반환 자체가 길이를 흘린다.
    // 같은 길이의 더미와 비교해 시간 특성을 맞춘 뒤 false 를 낸다.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(payload: SessionPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/** 서명이 맞지 않거나 만료됐으면 null. 예외를 던지지 않는다 — 호출부는 항상 로그인으로 보내면 된다. */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): SessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!safeEqual(signature, sign(body, secret))) return null;

  try {
    const payload = JSON.parse(fromBase64url(body).toString("utf8")) as SessionPayload;
    if (typeof payload?.name !== "string" || typeof payload?.issuedAt !== "number") return null;

    const ageSeconds = (Date.now() - payload.issuedAt) / 1000;
    if (ageSeconds > maxAgeSeconds || ageSeconds < -60) return null; // 미래 발급도 거부

    return payload;
  } catch {
    return null;
  }
}

/** .env 의 USERS 를 읽는다. 비어 있으면 이름 선택 없이 쓴다. */
export function configuredUsers(raw: string | undefined = process.env.USERS): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
