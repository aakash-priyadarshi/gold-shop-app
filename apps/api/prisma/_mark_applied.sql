UPDATE "_prisma_migrations"
SET "rolled_back_at" = NULL,
    "finished_at" = NOW(),
    "applied_steps_count" = 1
WHERE "migration_name" = '20260217111051_chat_blocking_and_notifications';

INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count", "logs")
SELECT gen_random_uuid()::text, 'manual', '20260217111051_chat_blocking_and_notifications', NOW(), 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260217111051_chat_blocking_and_notifications'
);