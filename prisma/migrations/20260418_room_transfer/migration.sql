-- Room Transfer: tracks every room change for a tenant with full history.
-- Supports past (corrections), present (immediate), and future (scheduled)
-- transfer dates. Daily cron executes SCHEDULED transfers on their date.

CREATE TYPE "RoomTransferStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "RoomTransfer" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "fromRoomId"      TEXT,          -- null for initial assignment edge cases
  "toRoomId"        TEXT NOT NULL,
  "transferDate"    TIMESTAMP(3) NOT NULL,
  "reason"          TEXT,
  "newMonthlyRent"  INTEGER,       -- null = keep current rent
  "oldMonthlyRent"  INTEGER,       -- snapshot of rent before transfer
  "status"          "RoomTransferStatus" NOT NULL DEFAULT 'SCHEDULED',
  "completedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoomTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "RoomTransfer_fromRoomId_fkey" FOREIGN KEY ("fromRoomId") REFERENCES "Room"("id"),
  CONSTRAINT "RoomTransfer_toRoomId_fkey" FOREIGN KEY ("toRoomId") REFERENCES "Room"("id")
);

CREATE INDEX "RoomTransfer_tenantId_idx" ON "RoomTransfer"("tenantId");
CREATE INDEX "RoomTransfer_toRoomId_idx" ON "RoomTransfer"("toRoomId");
CREATE INDEX "RoomTransfer_status_idx" ON "RoomTransfer"("status");
CREATE INDEX "RoomTransfer_transferDate_idx" ON "RoomTransfer"("transferDate");

-- Make Tenant.roomId nullable so a tenant can be temporarily unassigned
-- (e.g. between two rooms during a transfer correction). The @unique
-- constraint is dropped — the booking flow validates room availability
-- in application logic instead.
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_roomId_key";
ALTER TABLE "Tenant" ALTER COLUMN "roomId" DROP NOT NULL;
