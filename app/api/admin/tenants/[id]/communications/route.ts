import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import type {
  CommunicationType,
  CommunicationDirection,
} from "@/lib/generated/prisma/client";

const VALID_TYPES: CommunicationType[] = [
  "PHONE",
  "SMS",
  "WHATSAPP",
  "IN_PERSON",
  "LETTER",
  "OTHER",
];
const VALID_DIRECTIONS: CommunicationDirection[] = ["IN", "OUT"];

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const list = await prisma.tenantCommunication.findMany({
    where: { tenantId: id },
    orderBy: { at: "desc" },
  });
  return Response.json({ communications: list });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json();
  const { type, direction, summary, at } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!direction || !VALID_DIRECTIONS.includes(direction)) {
    return Response.json({ error: "Invalid direction" }, { status: 400 });
  }
  if (!summary || typeof summary !== "string" || !summary.trim()) {
    return Response.json({ error: "summary required" }, { status: 400 });
  }

  const atDate = at ? new Date(at) : new Date();
  if (Number.isNaN(atDate.getTime())) {
    return Response.json({ error: "Invalid at" }, { status: 400 });
  }

  const entry = await prisma.tenantCommunication.create({
    data: {
      tenantId: id,
      type,
      direction,
      summary: summary.trim(),
      at: atDate,
    },
  });

  return Response.json({ id: entry.id });
}
