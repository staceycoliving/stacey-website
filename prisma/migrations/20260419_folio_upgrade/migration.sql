-- ─── Folio upgrade: emergency contact, language, archive, notes metadata,
--    tenant documents, tenant communications ──────────────────────────

-- Tenant: new fields
ALTER TABLE "Tenant"
  ADD COLUMN "emergencyContactName"  TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "language"              TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "archivedAt"            TIMESTAMP(3);

CREATE INDEX "Tenant_archivedAt_idx" ON "Tenant"("archivedAt");

-- Note: tags + sticky + follow-up
ALTER TABLE "Note"
  ADD COLUMN "tags"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sticky"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "followUpAt"   TIMESTAMP(3);

CREATE INDEX "Note_followUpAt_idx" ON "Note"("followUpAt");
CREATE INDEX "Note_sticky_idx"      ON "Note"("sticky");

-- ─── TenantDocument (manual uploads + generated artifacts) ─────
CREATE TYPE "TenantDocumentCategory" AS ENUM (
  'CONTRACT',
  'COMPLIANCE',
  'FINANCIAL',
  'CORRESPONDENCE',
  'OTHER'
);

CREATE TABLE "TenantDocument" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "filename"    TEXT NOT NULL,
  "category"    "TenantDocumentCategory" NOT NULL DEFAULT 'OTHER',
  "url"         TEXT NOT NULL,
  "description" TEXT,
  "uploadedBy"  TEXT,
  "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenantDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);
CREATE INDEX "TenantDocument_tenantId_idx"  ON "TenantDocument"("tenantId");
CREATE INDEX "TenantDocument_category_idx"  ON "TenantDocument"("category");

-- ─── TenantCommunication (phone/SMS/WhatsApp/in-person log) ────
CREATE TYPE "CommunicationType" AS ENUM (
  'PHONE',
  'SMS',
  'WHATSAPP',
  'IN_PERSON',
  'LETTER',
  'OTHER'
);
CREATE TYPE "CommunicationDirection" AS ENUM ('IN', 'OUT');

CREATE TABLE "TenantCommunication" (
  "id"         TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "type"       "CommunicationType" NOT NULL,
  "direction"  "CommunicationDirection" NOT NULL,
  "summary"    TEXT NOT NULL,
  "at"         TIMESTAMP(3) NOT NULL,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenantCommunication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantCommunication_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);
CREATE INDEX "TenantCommunication_tenantId_idx" ON "TenantCommunication"("tenantId");
CREATE INDEX "TenantCommunication_at_idx"        ON "TenantCommunication"("at");
