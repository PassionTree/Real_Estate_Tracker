import { describe, expect, it } from "vitest";
import {
  configuredUsers,
  createSessionToken,
  safeEqual,
  verifySessionToken,
} from "../session";

const SECRET = "test-secret-0123456789";

describe("세션 토큰", () => {
  it("서명한 토큰을 되읽는다", () => {
    const token = createSessionToken({ name: "남편", issuedAt: Date.now() }, SECRET);
    expect(verifySessionToken(token, SECRET)?.name).toBe("남편");
  });

  it("다른 키로 서명한 토큰을 거부한다", () => {
    const token = createSessionToken({ name: "남편", issuedAt: Date.now() }, "other-secret");
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("페이로드를 변조하면 거부한다", () => {
    const token = createSessionToken({ name: "남편", issuedAt: Date.now() }, SECRET);
    const [, signature] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ name: "침입자", issuedAt: Date.now() })).toString("base64url")}.${signature}`;
    expect(verifySessionToken(forged, SECRET)).toBeNull();
  });

  it("만료된 토큰을 거부한다", () => {
    const old = createSessionToken({ name: "남편", issuedAt: Date.now() - 40 * 24 * 3600 * 1000 }, SECRET);
    expect(verifySessionToken(old, SECRET, 30 * 24 * 3600)).toBeNull();
  });

  it("미래에 발급된 토큰을 거부한다", () => {
    const future = createSessionToken({ name: "남편", issuedAt: Date.now() + 3600 * 1000 }, SECRET);
    expect(verifySessionToken(future, SECRET)).toBeNull();
  });

  it("망가진 입력에 예외를 던지지 않는다", () => {
    for (const bad of [undefined, null, "", "a", "a.b.c", "!!!.???", "."]) {
      expect(() => verifySessionToken(bad, SECRET)).not.toThrow();
      expect(verifySessionToken(bad, SECRET)).toBeNull();
    }
  });
});

describe("safeEqual", () => {
  it("길이가 달라도 예외 없이 false", () => {
    expect(() => safeEqual("abc", "abcdef")).not.toThrow();
    expect(safeEqual("abc", "abcdef")).toBe(false);
  });

  it("같으면 true, 다르면 false", () => {
    expect(safeEqual("hunter2", "hunter2")).toBe(true);
    expect(safeEqual("hunter2", "hunter3")).toBe(false);
  });
});

describe("configuredUsers", () => {
  it("콤마 목록을 다듬어 읽는다", () => {
    expect(configuredUsers("남편, 아내 ,")).toEqual(["남편", "아내"]);
  });

  it("비어 있으면 빈 배열", () => {
    expect(configuredUsers("")).toEqual([]);
    expect(configuredUsers(undefined)).toEqual([]);
  });
});
