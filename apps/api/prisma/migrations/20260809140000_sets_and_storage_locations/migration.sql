-- Jewelry Sets + hierarchical storage locations

CREATE TYPE "StorageLocationKind" AS ENUM ('AREA', 'CABINET', 'BIN');

ALTER TYPE "JewelleryType" ADD VALUE 'SET';

CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "kind" "StorageLocationKind" NOT NULL DEFAULT 'AREA',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventoryItem" ADD COLUMN "setDiscountType" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "setDiscountValue" DOUBLE PRECISION;
ALTER TABLE "InventoryItem" ADD COLUMN "locationId" TEXT;

CREATE TABLE "InventorySetComponent" (
    "id" TEXT NOT NULL,
    "setItemId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "role" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySetComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorageLocation_shopId_isActive_idx" ON "StorageLocation"("shopId", "isActive");
CREATE INDEX "StorageLocation_shopId_parentId_idx" ON "StorageLocation"("shopId", "parentId");
CREATE INDEX "StorageLocation_parentId_idx" ON "StorageLocation"("parentId");
CREATE INDEX "InventoryItem_locationId_idx" ON "InventoryItem"("locationId");
CREATE UNIQUE INDEX "InventorySetComponent_componentItemId_key" ON "InventorySetComponent"("componentItemId");
CREATE INDEX "InventorySetComponent_setItemId_idx" ON "InventorySetComponent"("setItemId");

ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventorySetComponent" ADD CONSTRAINT "InventorySetComponent_setItemId_fkey" FOREIGN KEY ("setItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventorySetComponent" ADD CONSTRAINT "InventorySetComponent_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill AREA locations from label conventions used by Vault & Tags UI
DO $$
DECLARE
  pair RECORD;
  loc_id TEXT;
BEGIN
  FOR pair IN
    SELECT DISTINCT i."shopId",
      CASE
        WHEN EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Showcase-A%' OR l = 'Showcase-A') THEN 'Showcase-A'
        WHEN EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Showcase-B%' OR l = 'Showcase-B') THEN 'Showcase-B'
        WHEN EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Main-Safe%' OR l ILIKE '%Safe%' OR l ILIKE '%Vault%') THEN 'Main-Safe'
        WHEN EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Workbench%' OR l ILIKE '%Artisan%') THEN 'Artisan-Workbench'
        ELSE NULL
      END AS loc_name
    FROM "InventoryItem" i
    WHERE cardinality(i."labels") > 0
  LOOP
    IF pair.loc_name IS NULL THEN
      CONTINUE;
    END IF;

    SELECT s."id" INTO loc_id
    FROM "StorageLocation" s
    WHERE s."shopId" = pair."shopId" AND s."name" = pair.loc_name
    LIMIT 1;

    IF loc_id IS NULL THEN
      loc_id := gen_random_uuid()::text;
      INSERT INTO "StorageLocation" ("id", "shopId", "name", "code", "kind", "sortOrder", "isActive", "createdAt", "updatedAt")
      VALUES (loc_id, pair."shopId", pair.loc_name, pair.loc_name, 'AREA', 0, true, NOW(), NOW());
    END IF;

    UPDATE "InventoryItem" i
    SET "locationId" = loc_id
    WHERE i."shopId" = pair."shopId"
      AND i."locationId" IS NULL
      AND (
        (pair.loc_name = 'Showcase-A' AND EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Showcase-A%' OR l = 'Showcase-A'))
        OR (pair.loc_name = 'Showcase-B' AND EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Showcase-B%' OR l = 'Showcase-B'))
        OR (pair.loc_name = 'Main-Safe' AND EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Main-Safe%' OR l ILIKE '%Safe%' OR l ILIKE '%Vault%')
            AND NOT EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Showcase%'))
        OR (pair.loc_name = 'Artisan-Workbench' AND EXISTS (SELECT 1 FROM unnest(i."labels") l WHERE l ILIKE '%Workbench%' OR l ILIKE '%Artisan%'))
      );
  END LOOP;
END $$;
