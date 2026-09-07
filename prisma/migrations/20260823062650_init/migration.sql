-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "priceManwon" INTEGER,
    "sourceUrl" TEXT,
    "dealType" TEXT NOT NULL DEFAULT '매매',
    "propertyType" TEXT NOT NULL DEFAULT '아파트',
    "status" TEXT NOT NULL DEFAULT '관심',
    "address" TEXT,
    "lawdCd" TEXT,
    "complexName" TEXT,
    "dong" TEXT,
    "ho" TEXT,
    "areaM2" REAL,
    "supplyAreaM2" REAL,
    "floor" INTEGER,
    "totalFloors" INTEGER,
    "builtYear" INTEGER,
    "householdCount" INTEGER,
    "depositManwon" INTEGER,
    "monthlyRentManwon" INTEGER,
    "maintenanceManwon" INTEGER,
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "direction" TEXT,
    "parking" TEXT,
    "petsAllowed" BOOLEAN,
    "commuteMinutes" INTEGER,
    "lat" REAL,
    "lng" REAL,
    "tags" TEXT NOT NULL DEFAULT '',
    "memo" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "priceManwon" INTEGER,
    "depositManwon" INTEGER,
    "monthlyRentManwon" INTEGER,
    "note" TEXT,
    "recordedBy" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 3,
    "isDealBreaker" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ListingScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "scoredBy" TEXT,
    CONSTRAINT "ListingScore_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListingScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_lawdCd_idx" ON "Listing"("lawdCd");

-- CreateIndex
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_recordedAt_idx" ON "PriceHistory"("listingId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_name_key" ON "Criterion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ListingScore_listingId_criterionId_key" ON "ListingScore"("listingId", "criterionId");
