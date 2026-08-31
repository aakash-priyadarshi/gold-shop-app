-- Bind managed seller smoke tokens to one shop. Existing administrative API
-- tokens remain unbound and are unaffected.
ALTER TABLE "ApiToken" ADD COLUMN "shopId" TEXT;

CREATE INDEX "ApiToken_shopId_idx" ON "ApiToken"("shopId");

ALTER TABLE "ApiToken"
ADD CONSTRAINT "ApiToken_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
