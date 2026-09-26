-- AlterTable
ALTER TABLE "WorkshopToleranceRule" ADD COLUMN "definitionId" VARCHAR(80) NOT NULL DEFAULT '',
ADD COLUMN "policy" VARCHAR(32) NOT NULL DEFAULT 'REQUIRE_CLASSIFICATION';

-- DropIndex
DROP INDEX "WorkshopToleranceRule_shopId_movementKind_materialKey_scale_key";

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopToleranceRule_shopId_movementKind_materialKey_scale_key" ON "WorkshopToleranceRule"("shopId", "movementKind", "materialKey", "scalePurpose", "definitionId");

-- CreateIndex
CREATE INDEX "WorkshopToleranceRule_shopId_movementKind_isActive_idx" ON "WorkshopToleranceRule"("shopId", "movementKind", "isActive");
