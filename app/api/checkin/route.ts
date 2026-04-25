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
    reservationId, firstName, lastName, dateOfBirth, nationality,
    idDocumentType, idDocumentNumber, street, zipCode, city, country,
    arrivalDate, departureDate, locationSlug, locationName,
    companionFirstName, companionLastName, signatureDataUrl,
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

  // Generate Meldeschein PDF (dynamic import, pdfkit is heavy)
  let pdfData: Buffer | null = null;
  try {
    const { generateMeldescheinPdf } = await import("@/lib/meldeschein-pdf");
    pdfData = await generateMeldescheinPdf({
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
      locationName: locationName || locationSlug,
      companionFirstName: companionFirstName || undefined,
      companionLastName: companionLastName || undefined,
      signatureDataUrl: signatureDataUrl || undefined,
    });
  } catch (err) {
    console.error("Meldeschein PDF generation failed:", err instanceof Error ? err.message : err);
  }
  console.log("PDF generated:", pdfData ? pdfData.length + " bytes" : "FAILED");

  try {
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
        companionFirstName: companionFirstName || null,
        companionLastName: companionLastName || null,
        pdfData: pdfData ? Buffer.from(pdfData) : null,
      },
    });
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Meldeschein DB save failed:", errMsg);
    return Response.json({ error: "Failed to save registration", detail: errMsg }, { status: 500 });
  }

  // Upload PDF to Google Drive
  if (pdfData) {
    try {
      const { uploadMeldescheinToDrive } = await import("@/lib/google-drive");
      const driveResult = await uploadMeldescheinToDrive({
        pdf: pdfData,
        firstName,
        lastName,
        locationName: locationName || locationSlug,
        arrivalDate,
      });
      console.log("Google Drive upload result:", driveResult);
    } catch (err: any) {
      console.error("Google Drive upload failed:", err?.message || err);
    }
  }

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
