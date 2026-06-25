-- Replace flat templates schema with 5-level prompt hierarchy

ALTER TABLE "user_favorite_templates" DROP CONSTRAINT IF EXISTS "user_favorite_templates_templateId_fkey";
ALTER TABLE "templates" DROP CONSTRAINT IF EXISTS "templates_authorId_fkey";
DROP TABLE IF EXISTS "user_favorite_templates";
DROP TABLE IF EXISTS "templates";

CREATE TABLE IF NOT EXISTS "domains" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "professions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "specializations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_favorite_templates" (
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_templates_pkey" PRIMARY KEY ("userId","templateId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "domains_name_key" ON "domains"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "professions_name_domainId_key" ON "professions"("name", "domainId");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_professionId_key" ON "roles"("name", "professionId");
CREATE UNIQUE INDEX IF NOT EXISTS "specializations_name_roleId_key" ON "specializations"("name", "roleId");
CREATE UNIQUE INDEX IF NOT EXISTS "templates_name_specializationId_key" ON "templates"("name", "specializationId");

DO $$ BEGIN
    ALTER TABLE "professions" ADD CONSTRAINT "professions_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "roles" ADD CONSTRAINT "roles_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "specializations" ADD CONSTRAINT "specializations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "templates" ADD CONSTRAINT "templates_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_favorite_templates" ADD CONSTRAINT "user_favorite_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_favorite_templates" ADD CONSTRAINT "user_favorite_templates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
