import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import {
  createLeaseSigningSession,
  isYousignConfigured,
} from "@/lib/yousign";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/observability";
import { leaseLimiter, checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiOk, apiBadRequest, apiServerError } from "@/lib/api-response";

// German month names for the contract date format
const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function formatDateGerman(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return `${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateDot(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

// ─── Fill .docx via raw XML replacement (preserves all formatting) ───
async function fillDocxTemplate(
  templateBuffer: Buffer,
  replacements: Record<string, string>
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);

  // Process all XML files in the docx (document.xml, headers, footers)
  const xmlFiles = [
    "word/document.xml",
    "word/header1.xml",
    "word/header2.xml",
    "word/header3.xml",
    "word/footer1.xml",
    "word/footer2.xml",
    "word/footer3.xml",
  ];

  for (const filePath of xmlFiles) {
    const file = zip.file(filePath);
    if (!file) continue;

    let xml = await file.async("string");

    // Replace placeholders — handle cases where {placeholder} might be split
    // across multiple XML runs (e.g. <w:t>{</w:t><w:t>tenantName</w:t><w:t>}</w:t>)
    // First: try simple replacement
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      // Escape XML special chars in value
      const safeValue = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      xml = xml.split(placeholder).join(safeValue);
    }

    // Second pass: handle split runs — rebuild <w:t> texts within each <w:r> parent,
    // find placeholders that span across <w:t> tags
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      // Check if placeholder chars are split across tags
      if (xml.includes(placeholder)) continue; // already replaced

      // Build regex that matches the placeholder chars with optional XML tags between them
      const chars = placeholder.split("");
      const pattern = chars
        .map((c) => c.replace(/[{}]/g, "\\$&"))
        .join("(?:</w:t></w:r><w:r[^>]*><w:rPr>.*?</w:rPr><w:t[^>]*>|</w:t></w:r><w:r[^>]*><w:t[^>]*>|</w:t><w:t[^>]*>)?");

      const regex = new RegExp(pattern, "g");
      const safeValue = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      xml = xml.replace(regex, safeValue);
    }

    zip.file(filePath, xml);
  }

  const result = await zip.generateAsync({ type: "nodebuffer" });
  return result;
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(leaseLimiter, request);
  if (!limit.success) return rateLimitResponse(limit);

  let step = "init";
  try {
    step = "parse body";
    const body = await request.json();

    const {
      bookingId,
      firstName,
      lastName,
      dateOfBirth,
      street,
      zipCode,
      addressCity,
      country,
      email,
      locationName,
      propertyAddress,
      roomCategory,
      monthlyRent,
      moveInDate,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !locationName || !roomCategory || !monthlyRent || !moveInDate) {
      return apiBadRequest("Missing required fields");
    }

    // ─── 1. Read template ───
    step = "read template";
    const templatePath = path.join(process.cwd(), "public", "templates", "mietvertrag.docx");
    const template = await readFile(templatePath);

    // ─── 2. Fill template via XML replacement (preserves formatting 1:1) ───
    step = "fill template";
    const today = new Date().toISOString().split("T")[0];
    const tenantAddress = [street, `${zipCode} ${addressCity}`, country]
      .filter(Boolean)
      .join(", ");

    const docBuffer = await fillDocxTemplate(template, {
      tenantName: `${firstName} ${lastName}`,
      dateOfBirth: formatDateDot(dateOfBirth),
      tenantAddress,
      agreementDate: formatDateGerman(today),
      propertyAddress,
      locationName,
      roomCategory,
      monthlyRent: String(monthlyRent),
      startDate: formatDateDot(moveInDate),
    });

    // ─── 3. Send to Yousign (if configured) ───
    step = "yousign";
    if (isYousignConfigured()) {
      const fileName = `mietvertrag-${firstName.toLowerCase()}-${lastName.toLowerCase()}.docx`;

      const session = await createLeaseSigningSession(
        docBuffer,
        fileName,
        { firstName, lastName, email }
      );

      // Store signature IDs on booking for webhook tracking
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            signatureRequestId: session.signatureRequestId,
            signatureDocumentId: session.documentId,
          },
        });
      }

      return apiOk({
        signingUrl: session.signingUrl,
        signatureRequestId: session.signatureRequestId,
        documentId: session.documentId,
        devMode: false as const,
      });
    }

    // ─── Fallback: dev mode ───
    return apiOk({
      signingUrl: null,
      signatureRequestId: null,
      documentId: null,
      devMode: true as const,
      documentBase64: docBuffer.toString("base64"),
      message: "Yousign not configured. Set YOUSIGN_API_KEY env var.",
    });
  } catch (err) {
    reportError(err, { scope: "lease-generate", tags: { step } });
    return apiServerError(`Failed to generate lease at step "${step}"`, String(err));
  }
}
