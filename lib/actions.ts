"use server";

/**
 * 매물 변경 액션.
 *
 * 가격이 바뀔 때마다 PriceHistory 를 남기는 것이 여기서 가장 중요한 일이다.
 * 이 기록은 소급이 불가능하므로, 저장 경로를 하나로 모아 빠뜨리지 않게 한다.
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatManwon, parseManwon } from "@/lib/money";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function currentUser(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, secret)?.name ?? null;
}

function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function money(form: FormData, key: string): number | null {
  return parseManwon(text(form, key));
}

function int(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (raw === null) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function float(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (raw === null) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * 빠른 등록.
 * 별칭 하나만 있어도 저장된다 — 등록 마찰을 줄이는 것이 이 앱의 성패를 가른다.
 */
export async function quickAddListing(formData: FormData) {
  const nickname = text(formData, "nickname");
  if (!nickname) return;

  const priceManwon = money(formData, "price");
  const user = await currentUser();

  const listing = await prisma.listing.create({
    data: {
      nickname,
      priceManwon,
      sourceUrl: text(formData, "sourceUrl"),
      dealType: text(formData, "dealType") ?? "매매",
      createdBy: user,
      // 첫 가격도 이력의 시작점으로 남긴다. 없으면 이후 변동을 계산할 기준이 없다.
      priceHistory: priceManwon !== null ? { create: { priceManwon, recordedBy: user } } : undefined,
    },
  });

  revalidatePath("/listings");
  revalidatePath("/");
  return listing.id;
}

const TEXT_FIELDS = [
  "nickname",
  "sourceUrl",
  "dealType",
  "propertyType",
  "status",
  "address",
  "lawdCd",
  "complexName",
  "dong",
  "ho",
  "direction",
  "parking",
  "memo",
] as const;

const INT_FIELDS = [
  "floor",
  "totalFloors",
  "builtYear",
  "householdCount",
  "rooms",
  "bathrooms",
  "commuteMinutes",
] as const;

const MONEY_FIELDS = ["priceManwon", "depositManwon", "monthlyRentManwon", "maintenanceManwon"] as const;

export async function updateListing(id: string, formData: FormData) {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) return;

  const data: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (formData.has(field)) data[field] = text(formData, field);
  }
  for (const field of INT_FIELDS) {
    if (formData.has(field)) data[field] = int(formData, field);
  }
  for (const field of MONEY_FIELDS) {
    if (formData.has(field)) data[field] = money(formData, field);
  }
  for (const field of ["areaM2", "supplyAreaM2"] as const) {
    if (formData.has(field)) data[field] = float(formData, field);
  }
  if (formData.has("tags")) {
    data.tags =
      (text(formData, "tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .join(",") || "";
  }
  if (formData.has("petsAllowed")) {
    const raw = text(formData, "petsAllowed");
    data.petsAllowed = raw === null ? null : raw === "가능";
  }

  // 별칭은 목록에서 매물을 알아보는 유일한 이름이라 비우지 않는다
  if (data.nickname === null) delete data.nickname;

  const priceChanged =
    ("priceManwon" in data && data.priceManwon !== existing.priceManwon) ||
    ("depositManwon" in data && data.depositManwon !== existing.depositManwon) ||
    ("monthlyRentManwon" in data && data.monthlyRentManwon !== existing.monthlyRentManwon);

  const user = await currentUser();

  await prisma.listing.update({
    where: { id },
    data: {
      ...data,
      // 가격이 바뀌면 반드시 이력을 남긴다. 이 기록은 나중에 만들 수 없다.
      priceHistory: priceChanged
        ? {
            create: {
              priceManwon: ("priceManwon" in data ? data.priceManwon : existing.priceManwon) as number | null,
              depositManwon: ("depositManwon" in data ? data.depositManwon : existing.depositManwon) as number | null,
              monthlyRentManwon: ("monthlyRentManwon" in data
                ? data.monthlyRentManwon
                : existing.monthlyRentManwon) as number | null,
              note: text(formData, "priceNote"),
              recordedBy: user,
            },
          }
        : undefined,
    },
  });

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/");
}

export async function updateListingStatus(id: string, status: string) {
  await prisma.listing.update({ where: { id }, data: { status } });
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/");
}

export async function deleteListing(id: string) {
  await prisma.listing.delete({ where: { id } });
  revalidatePath("/listings");
  revalidatePath("/");
  redirect("/listings");
}

export async function setScore(listingId: string, criterionId: string, value: number | null) {
  const user = await currentUser();

  if (value === null) {
    // 점수를 지우는 것과 1점을 주는 것은 다른 뜻이다.
    // 지운 항목은 계산에서 빠져야 하므로 행 자체를 삭제한다.
    await prisma.listingScore.deleteMany({ where: { listingId, criterionId } });
  } else {
    await prisma.listingScore.upsert({
      where: { listingId_criterionId: { listingId, criterionId } },
      create: { listingId, criterionId, value, scoredBy: user },
      update: { value, scoredBy: user },
    });
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
}

export async function updateCriterion(id: string, weight: number, isDealBreaker: boolean) {
  await prisma.criterion.update({
    where: { id },
    data: { weight: Math.max(0, Math.min(5, weight)), isDealBreaker },
  });
  revalidatePath("/settings");
  revalidatePath("/listings");
}

export async function addCriterion(formData: FormData) {
  const name = text(formData, "name");
  if (!name) return;

  const count = await prisma.criterion.count();
  await prisma.criterion.create({
    data: { name, weight: int(formData, "weight") ?? 3, sortOrder: count },
  });
  revalidatePath("/settings");
  revalidatePath("/listings");
}

export async function deleteCriterion(id: string) {
  await prisma.criterion.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/listings");
}

/**
 * 단지 후보를 관심 매물로 담는다.
 *
 * priceManwon 은 일부러 비워 둔다 — 실거래가는 호가가 아니다.
 * 실거래가는 지나간 사실이고 호가는 지금의 협상 시작점이라, 이 둘을 섞으면
 * 이 앱이 지켜 온 구분이 무너진다. 대신 메모에 실거래 중앙값을 남겨 비교 기준만 준다.
 */
export async function addComplexAsListing(candidate: {
  aptNm: string;
  umdNm: string | null;
  buildYear: number | null;
  areaGroup: number;
  dealCount: number;
  medianManwon: number;
  latestDealDate: string;
}) {
  const user = await currentUser();
  const latest = new Date(candidate.latestDealDate);

  const listing = await prisma.listing.create({
    data: {
      nickname: candidate.aptNm,
      complexName: candidate.aptNm,
      address: candidate.umdNm,
      areaM2: candidate.areaGroup,
      builtYear: candidate.buildYear,
      createdBy: user,
      memo: `최근 실거래 중앙값 ${formatManwon(candidate.medianManwon)} (${candidate.dealCount}건, ~${latest.toLocaleDateString("ko-KR")}). 실제 호가는 딥링크로 확인해 직접 입력하세요.`,
    },
  });

  revalidatePath("/listings");
  revalidatePath("/");
  return listing.id;
}
