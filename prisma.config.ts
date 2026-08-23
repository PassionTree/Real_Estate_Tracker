import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * DATABASE_URL 이 없으면 Prisma 는
 * "The datasource.url property is required..." 라는 메시지만 내는데,
 * 무엇을 해야 하는지 알려주지 않는다. 여기서 먼저 잡아 안내한다.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const hasEnvFile = existsSync(resolve(process.cwd(), ".env"));
  throw new Error(
    hasEnvFile
      ? [
          "DATABASE_URL 이 비어 있습니다.",
          "",
          ".env 파일에 아래 줄이 있는지 확인하세요:",
          '  DATABASE_URL="file:./dev.db"',
        ].join("\n")
      : [
          ".env 파일이 없습니다.",
          "",
          "프로젝트 폴더에서 아래를 실행한 뒤 다시 시도하세요:",
          "  cp .env.example .env        (Windows: copy .env.example .env)",
          "",
          "그다음 .env 를 열어 SHARED_PASSWORD 와 SESSION_SECRET 을 채우세요.",
        ].join("\n"),
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
