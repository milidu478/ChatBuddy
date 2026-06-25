-- Backfill null session titles before enforcing NOT NULL
UPDATE "chat_sessions" SET "title" = 'New Chat' WHERE "title" IS NULL;

-- Align title column with schema: required + default
ALTER TABLE "chat_sessions" ALTER COLUMN "title" SET DEFAULT 'New Chat';
ALTER TABLE "chat_sessions" ALTER COLUMN "title" SET NOT NULL;
