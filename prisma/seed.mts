/**
 * 기본 평가 항목을 넣는다.
 * 이미 있으면 건드리지 않는다 — 사용자가 조정한 가중치를 덮어쓰면 안 된다.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";
import defaults from "../data/criteria-default.json" with { type: "json" };
import { PrismaClient } from "../lib/generated/prisma/client.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL 이 없습니다. .env.example 을 .env 로 복사하세요.");

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

let created = 0;
for (const criterion of defaults.criteria) {
  const existing = await prisma.criterion.findUnique({ where: { name: criterion.name } });
  if (existing) continue;
  await prisma.criterion.create({ data: criterion });
  created += 1;
}

console.log(
  created > 0
    ? `기본 평가 항목 ${created}개를 추가했습니다.`
    : "기본 평가 항목이 이미 있어 그대로 두었습니다.",
);

await prisma.$disconnect();
