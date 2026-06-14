-- Add modality and defaultModules to SaasPlan
ALTER TABLE "SaasPlan" ADD COLUMN IF NOT EXISTS "modality" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "SaasPlan" ADD COLUMN IF NOT EXISTS "defaultModules" JSONB NOT NULL DEFAULT '[]';

-- Add enabledModules to Barbershop
ALTER TABLE "Barbershop" ADD COLUMN IF NOT EXISTS "enabledModules" JSONB NOT NULL DEFAULT '[]';
