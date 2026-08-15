ALTER TABLE "InventoryItem"
ADD COLUMN "grossWeightGrams" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "InventoryItem" AS item
SET "grossWeightGrams" = item."totalWeightGrams" + COALESCE((
  SELECT SUM(
    CASE
      WHEN jsonb_typeof(gemstone.value -> 'caratWeight') IN ('number', 'string')
        AND (gemstone.value ->> 'caratWeight') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (gemstone.value ->> 'caratWeight')::DOUBLE PRECISION
      ELSE 0
    END
    * CASE
        WHEN jsonb_typeof(gemstone.value -> 'count') IN ('number', 'string')
          AND (gemstone.value ->> 'count') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN GREATEST((gemstone.value ->> 'count')::DOUBLE PRECISION, 0)
        WHEN jsonb_typeof(gemstone.value -> 'quantity') IN ('number', 'string')
          AND (gemstone.value ->> 'quantity') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN GREATEST((gemstone.value ->> 'quantity')::DOUBLE PRECISION, 0)
        ELSE 1
      END
  )
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(item."composition" -> 'gemstones') = 'array'
        THEN item."composition" -> 'gemstones'
      ELSE '[]'::jsonb
    END
  ) AS gemstone
), 0) * 0.2;
