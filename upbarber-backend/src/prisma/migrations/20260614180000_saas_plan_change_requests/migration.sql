-- CreateTable
CREATE TABLE "SaasPlanChangeRequest" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "currentPlanId" TEXT,
    "targetPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "reviewedByMasterId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaasPlanChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaasPlanChangeRequest_barbershopId_status_idx" ON "SaasPlanChangeRequest"("barbershopId", "status");

-- CreateIndex
CREATE INDEX "SaasPlanChangeRequest_targetPlanId_idx" ON "SaasPlanChangeRequest"("targetPlanId");

-- AddForeignKey
ALTER TABLE "SaasPlanChangeRequest" ADD CONSTRAINT "SaasPlanChangeRequest_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasPlanChangeRequest" ADD CONSTRAINT "SaasPlanChangeRequest_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "SaasPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaasPlanChangeRequest" ADD CONSTRAINT "SaasPlanChangeRequest_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "SaasPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
