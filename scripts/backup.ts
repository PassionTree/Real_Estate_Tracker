/**
 * 백업.
 *
 * SQLite 파일 하나에 몇 달치 매물 기록이 들어 있는 self-hosted 앱이다.
 * 이 파일이 날아가면 임장 다니며 쌓은 판단이 통째로 사라진다.
 *
 *   npm run backup
 *
 * 만든 백업은 backups/ 아래에 쌓이고 최근 10개만 남는다.
 * 디스크가 통째로 죽는 경우까지 막으려면 가끔 다른 저장소로 복사해 두어야 한다.
 */
import "dotenv/config";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const KEEP = 10;
const root = process.cwd();
const backupRoot = join(root, "backups");

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const filePath = url.replace(/^file:/, "");
  return resolve(root, filePath);
}

const source = dbPath();
if (!existsSync(source)) {
  console.error(`데이터베이스를 찾지 못했습니다: ${source}`);
  console.error("DATABASE_URL 을 확인하거나 먼저 npm run db:migrate 를 실행하세요.");
  process.exit(1);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .slice(0, 16);
const target = join(backupRoot, stamp);
mkdirSync(target, { recursive: true });

copyFileSync(source, join(target, basename(source)));

// SQLite 는 WAL 모드에서 -wal / -shm 을 함께 쓴다. 있으면 같이 복사한다.
for (const suffix of ["-wal", "-shm", "-journal"]) {
  const extra = `${source}${suffix}`;
  if (existsSync(extra)) copyFileSync(extra, join(target, `${basename(source)}${suffix}`));
}

// 임장 사진(Phase 2)이 생기면 같이 백업한다
const uploads = join(root, "uploads");
if (existsSync(uploads)) {
  cpSync(uploads, join(target, "uploads"), { recursive: true });
}

const kept = readdirSync(backupRoot)
  .filter((name) => statSync(join(backupRoot, name)).isDirectory())
  .sort()
  .reverse();

for (const stale of kept.slice(KEEP)) {
  rmSync(join(backupRoot, stale), { recursive: true, force: true });
}

console.log(`백업했습니다: backups/${stamp}`);
console.log(`보관 중인 백업 ${Math.min(kept.length, KEEP)}개 (최근 ${KEEP}개만 남깁니다).`);
console.log("디스크가 통째로 죽는 경우를 대비해 가끔 다른 저장소로도 복사해 두세요.");
