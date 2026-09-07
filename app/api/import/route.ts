import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/actions";
import { decodeCsvBytes, duplicateKey, parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";

type Mode = "skip" | "overwrite" | "append";

/**
 * CSV 가져오기.
 *
 * dryRun 으로 먼저 미리보기를 돌려 무엇이 들어오고 무엇이 걸러지는지 보여준 뒤 확정한다.
 * 한 행이 잘못돼도 나머지는 살린다 — 30행짜리 파일이 오타 하나로 통째로 거부되면
 * 아무도 다시 시도하지 않는다.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const mode = (String(form.get("mode") ?? "skip") as Mode) ?? "skip";
  const dryRun = String(form.get("dryRun") ?? "") === "1";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV 파일을 선택하세요." }, { status: 400 });
  }

  const text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
  const { rows, unknownHeaders } = parseCsv(text);

  const existing = await prisma.listing.findMany({
    select: { id: true, nickname: true, complexName: true, sourceUrl: true },
  });
  const existingByKey = new Map(existing.map((listing) => [duplicateKey(listing), listing.id]));

  const valid = rows.filter((row) => row.errors.length === 0);
  const failed = rows.filter((row) => row.errors.length > 0);

  const duplicates = valid.filter((row) => existingByKey.has(duplicateKey(row.values)));
  const fresh = valid.filter((row) => !existingByKey.has(duplicateKey(row.values)));

  const summary = {
    total: rows.length,
    willCreate: mode === "append" ? valid.length : fresh.length,
    willUpdate: mode === "overwrite" ? duplicates.length : 0,
    willSkip: mode === "skip" ? duplicates.length : 0,
    failed: failed.map((row) => ({ rowNumber: row.rowNumber, errors: row.errors })),
    unknownHeaders,
  };

  if (dryRun) return NextResponse.json({ dryRun: true, ...summary });

  const user = await currentUser();

  for (const row of valid) {
    const key = duplicateKey(row.values);
    const existingId = existingByKey.get(key);
    const values = row.values as Record<string, never>;

    if (existingId && mode === "skip") continue;

    if (existingId && mode === "overwrite") {
      await prisma.listing.update({ where: { id: existingId }, data: values });
      continue;
    }

    const priceManwon = (row.values.priceManwon as number | undefined) ?? null;
    await prisma.listing.create({
      data: {
        ...values,
        nickname: String(row.values.nickname),
        createdBy: user,
        // 가져온 가격도 이력의 시작점으로 남긴다
        priceHistory:
          priceManwon !== null ? { create: { priceManwon, note: "CSV 가져오기", recordedBy: user } } : undefined,
      },
    });
  }

  return NextResponse.json({ dryRun: false, ...summary });
}
