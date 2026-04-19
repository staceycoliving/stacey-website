-- ─── Housekeeping: Inspection result on move-out tasks ─────
-- Adds per-task inspection state for cleaners so move-out tasks
-- can be flagged CLEAN or ISSUE directly from the housekeeping page.
-- The "ISSUE" flag is a hand-off to Admin — the actual Defect
-- record (with deduction + photos) is still created from the
-- tenant folio, which has the full context.

CREATE TYPE "InspectionResult" AS ENUM ('CLEAN', 'ISSUE');

ALTER TABLE "CleaningTask"
  ADD COLUMN "inspectionResult" "InspectionResult",
  ADD COLUMN "inspectionNotes" TEXT;
