-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aptSeq" TEXT,
    "aptNm" TEXT NOT NULL,
    "lawdCd" TEXT NOT NULL,
    "umdNm" TEXT,
    "jibun" TEXT,
    "roadNm" TEXT,
    "buildYear" INTEGER,
    "excluUseAr" REAL NOT NULL,
    "areaGroup" INTEGER NOT NULL,
    "floor" INTEGER,
    "dealAmountManwon" INTEGER NOT NULL,
    "dealDate" DATETIME NOT NULL,
    "dealYmd" TEXT NOT NULL,
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegionSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lawdCd" TEXT NOT NULL,
    "dealYmd" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Transaction_lawdCd_dealYmd_idx" ON "Transaction"("lawdCd", "dealYmd");

-- CreateIndex
CREATE INDEX "Transaction_aptSeq_areaGroup_idx" ON "Transaction"("aptSeq", "areaGroup");

-- CreateIndex
CREATE INDEX "Transaction_buildYear_idx" ON "Transaction"("buildYear");

-- CreateIndex
CREATE UNIQUE INDEX "RegionSync_lawdCd_dealYmd_key" ON "RegionSync"("lawdCd", "dealYmd");
