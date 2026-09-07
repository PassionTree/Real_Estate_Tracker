/**
 * PrismaClient 싱글턴.
 *
 * 개발 중 핫리로드마다 새 클라이언트를 만들면 SQLite 커넥션이 계속 쌓인다.
 * globalThis 에 붙여 재사용한다.
 *
 * Prisma 7 부터는 드라이버 어댑터가 필수라 SQLite 어댑터를 함께 넘긴다.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL 이 없습니다. .env.example 을 .env 로 복사한 뒤 값을 채우세요.",
    );
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
