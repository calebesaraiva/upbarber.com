ALTER TABLE "Barbershop"
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN "registrationSource" TEXT NOT NULL DEFAULT 'master';

ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP WHERE "isActive" = true;

ALTER TABLE "SaasInvoice"
ADD COLUMN "pixPayload" TEXT;

CREATE TABLE "AuthCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "RegistrationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationInvite_tokenHash_key" ON "RegistrationInvite"("tokenHash");

ALTER TABLE "AuthCode"
ADD CONSTRAINT "AuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
