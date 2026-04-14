-- ─── Housekeeping ──────────────────────────────────────────
CREATE TYPE "CleaningTaskType" AS ENUM ('MOVE_IN', 'MOVE_OUT');
CREATE TYPE "CleaningTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

CREATE TABLE "CleaningTask" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "taskType" "CleaningTaskType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "locationSlug" TEXT,
    "roomLabel" TEXT,
    "guestName" TEXT,
    "status" "CleaningTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CleaningTask_taskKey_key" ON "CleaningTask"("taskKey");
CREATE INDEX "CleaningTask_date_idx" ON "CleaningTask"("date");
CREATE INDEX "CleaningTask_locationSlug_idx" ON "CleaningTask"("locationSlug");
CREATE INDEX "CleaningTask_status_idx" ON "CleaningTask"("status");
