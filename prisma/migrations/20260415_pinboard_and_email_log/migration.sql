-- Team pinboard: simple notes the admin team leaves for each other
-- (e.g. "Mühlenkamp Alarm rattert weiter, Termin Elektriker Di."). Free
-- text, optional tenant-pin so you can attach a note to a specific
-- tenant, plus a sticky-flag for important ones.

CREATE TABLE "TeamNote" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "content"   TEXT NOT NULL,
  "author"    TEXT,
  "sticky"    BOOLEAN NOT NULL DEFAULT false,
  "tenantId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeamNote_createdAt_idx" ON "TeamNote"("createdAt");
CREATE INDEX "TeamNote_sticky_idx" ON "TeamNote"("sticky");

-- Sent email log: every automated + manual resend is written here so we
-- have a single place to ask "wer hat wann welche Email bekommen, hat
-- der Send geklappt". Used for the dashboard widget + /admin/emails page.

CREATE TABLE "SentEmail" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "templateKey"  TEXT NOT NULL,    -- e.g. "welcome", "rent_reminder"
  "recipient"    TEXT NOT NULL,    -- email address
  "subject"      TEXT,             -- nullable to allow the sender libs to skip it initially
  "entityType"   TEXT,             -- "tenant" | "booking" | null
  "entityId"     TEXT,
  "resendId"     TEXT,             -- Resend API message id, when returned
  "status"       TEXT NOT NULL DEFAULT 'sent',  -- "sent" | "failed"
  "error"        TEXT,             -- error message if status=failed
  "triggeredBy"  TEXT NOT NULL DEFAULT 'auto',  -- "auto" | "manual_resend" | "cron"
  "sentAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SentEmail_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SentEmail_sentAt_idx" ON "SentEmail"("sentAt");
CREATE INDEX "SentEmail_recipient_idx" ON "SentEmail"("recipient");
CREATE INDEX "SentEmail_templateKey_idx" ON "SentEmail"("templateKey");
CREATE INDEX "SentEmail_entityType_entityId_idx" ON "SentEmail"("entityType", "entityId");
