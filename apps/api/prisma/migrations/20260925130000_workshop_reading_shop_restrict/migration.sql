-- Captured readings are immutable. A shop deletion must not cascade into the
-- reading trigger; retain the shop and its physical evidence instead.
ALTER TABLE "WorkshopScaleReading" DROP CONSTRAINT "WorkshopScaleReading_shopId_fkey";
ALTER TABLE "WorkshopScaleReading" ADD CONSTRAINT "WorkshopScaleReading_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
