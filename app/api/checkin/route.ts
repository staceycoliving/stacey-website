import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    reservationId,
    firstName,
    lastName,
    dateOfBirth,
    nationality,
    idDocumentType,
    idDocumentNumber,
    street,
    zipCode,
    city,
    country,
    arrivalDate,
    departureDate,
    locationSlug,
  } = body;

  if (!reservationId || !firstName || !lastName || !dateOfBirth || !nationality ||
      !idDocumentType || !idDocumentNumber || !street || !zipCode || !city ||
      !country || !arrivalDate || !departureDate || !locationSlug) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if already submitted
  const existing = await prisma.meldeschein.findUnique({
    where: { apaleoReservationId: reservationId },
  });

  if (existing) {
    return Response.json({ ok: true, alreadyCompleted: true });
  }

  await prisma.meldeschein.create({
    data: {
      apaleoReservationId: reservationId,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      nationality,
      idDocumentType,
      idDocumentNumber,
      street,
      zipCode,
      city,
      country,
      arrivalDate: new Date(arrivalDate),
      departureDate: new Date(departureDate),
      locationSlug,
    },
  });

  // TODO: Trigger Kiwi/Salto access activation here
  // - Alster: Kiwi only
  // - Downtown DT01-05,DT07: Kiwi only
  // - Downtown other: Kiwi + Salto

  return Response.json({ ok: true });
}

// Check if Meldeschein was already submitted for a reservation
export async function GET(request: NextRequest) {
  const reservationId = request.nextUrl.searchParams.get("reservationId");
  if (!reservationId) {
    return Response.json({ error: "Missing reservationId" }, { status: 400 });
  }

  const existing = await prisma.meldeschein.findUnique({
    where: { apaleoReservationId: reservationId },
  });

  return Response.json({ completed: !!existing });
}
