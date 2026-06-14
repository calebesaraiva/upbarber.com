ALTER TABLE "Product"
ADD COLUMN "branchId" TEXT;

CREATE INDEX "Product_branchId_idx"
ON "Product"("branchId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
