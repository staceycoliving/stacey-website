import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type {
  CleaningTaskStatus,
  CleaningTaskType,
  InspectionResult,
} from "@/lib/generated/prisma/client";

const VALID_STATUSES: CleaningTaskStatus[] = ["OPEN", "IN_PROGRESS", "DONE"];
const VALID_TYPES: CleaningTaskType[] = ["MOVE_IN", "MOVE_OUT"];
const VALID_INSPECTIONS: InspectionResult[] = ["CLEAN", "ISSUE"];

/**
 * POST /api/admin/housekeeping
 *
 * Upsert a cleaning task by taskKey. Body fields:
 *   taskKey, taskType, date, locationSlug?, roomLabel?, guestName?,
 *   status?, assignedTo?, notes?
 *
 * Tasks are projected from tenant move-ins/outs and apaleo reservations on
 * read; only the editable status/assignedTo/notes is persisted here.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { taskKey, taskType, date } = body;

  if (!taskKey || !taskType || !date) {
    return Response.json({ error: "taskKey, taskType, date required" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(taskType)) {
    return Response.json({ error: "Invalid taskType" }, { status: 400 });
  }

  const baseData = {
    taskType,
    date: new Date(date),
    locationSlug: body.locationSlug ?? null,
    roomLabel: body.roomLabel ?? null,
    guestName: body.guestName ?? null,
  };

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    updateData.status = body.status;
  }
  if (body.assignedTo !== undefined) {
    updateData.assignedTo = body.assignedTo ? String(body.assignedTo).trim() : null;
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.inspectionResult !== undefined) {
    if (body.inspectionResult === null) {
      updateData.inspectionResult = null;
    } else if (!VALID_INSPECTIONS.includes(body.inspectionResult)) {
      return Response.json({ error: "Invalid inspectionResult" }, { status: 400 });
    } else {
      updateData.inspectionResult = body.inspectionResult;
    }
  }
  if (body.inspectionNotes !== undefined) {
    updateData.inspectionNotes = body.inspectionNotes
      ? String(body.inspectionNotes).trim()
      : null;
  }

  const task = await prisma.cleaningTask.upsert({
    where: { taskKey },
    create: { taskKey, ...baseData, ...updateData },
    update: { ...baseData, ...updateData },
  });

  return Response.json({ id: task.id, status: task.status });
}
