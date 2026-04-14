-- ─── Room status ───────────────────────────────────────────
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DEACTIVATED');

ALTER TABLE "Room" ADD COLUMN "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE';

-- ─── Booking cancellation reason ──────────────────────────
ALTER TABLE "Booking" ADD COLUMN "cancellationReason" TEXT;

-- ─── ExtraCharge ───────────────────────────────────────────
CREATE TABLE "ExtraCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExtraCharge_tenantId_idx" ON "ExtraCharge"("tenantId");

ALTER TABLE "ExtraCharge" ADD CONSTRAINT "ExtraCharge_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RentAdjustment ────────────────────────────────────────
CREATE TABLE "RentAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TIMESTAMP(3),
    "originalAmount" INTEGER NOT NULL,
    "adjustedAmount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentAdjustment_tenantId_idx" ON "RentAdjustment"("tenantId");

ALTER TABLE "RentAdjustment" ADD CONSTRAINT "RentAdjustment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Defect ────────────────────────────────────────────────
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deductionAmount" INTEGER NOT NULL,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Defect_tenantId_idx" ON "Defect"("tenantId");

ALTER TABLE "Defect" ADD CONSTRAINT "Defect_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Note ──────────────────────────────────────────────────
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_tenantId_idx" ON "Note"("tenantId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
