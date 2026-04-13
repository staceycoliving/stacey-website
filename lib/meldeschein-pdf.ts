import PDFDocument from "pdfkit";
import { readFile } from "fs/promises";
import path from "path";

const PINK = "#FCB0C0";
const BLACK = "#1A1A1A";
const GRAY = "#888888";
const LIGHT_BG = "#FAFAFA";

const LOCATION_ADDRESSES: Record<string, string> = {
  alster: "Gurlittstraße 28, 20099 Hamburg",
  downtown: "Brandstwiete 36, 20457 Hamburg",
};

interface MeldescheinPdfData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idDocumentType: string;
  idDocumentNumber: string;
  street: string;
  zipCode: string;
  city: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  locationSlug: string;
  locationName: string;
  companionFirstName?: string;
  companionLastName?: string;
}

function formatDateGerman(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export async function generateMeldescheinPdf(data: MeldescheinPdfData): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "lib/assets/stacey-logo-pink.png");
  const fontRegular = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Regular.ttf");
  const fontBold = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Bold.ttf");

  const accommodationAddress = LOCATION_ADDRESSES[data.locationSlug] || "";

  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, bottom: 40, left: 50, right: 50 },
    });

    doc.registerFont("Mont", fontRegular);
    doc.registerFont("MontBold", fontBold);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const PAD = 50;
    const contentWidth = W - PAD * 2;
    const halfWidth = contentWidth / 2 - 4;

    // ─── Header ─────────────────────────────────────────
    try {
      doc.image(logoPath, PAD, 35, { height: 20 });
    } catch {
      doc.fontSize(18).font("MontBold").fillColor(PINK).text("STACEY", PAD, 35);
    }

    doc.rect(0, 68, W, 2).fill(PINK);
    doc.y = 90;

    // ─── Title ──────────────────────────────────────────
    doc.fontSize(16).font("MontBold").fillColor(BLACK)
      .text("Meldeschein", PAD, doc.y, { width: contentWidth });
    doc.fontSize(9).font("Mont").fillColor(GRAY)
      .text("Beherbergungsstätte · §§ 29-30 Bundesmeldegesetz (BMG)", PAD, doc.y, { width: contentWidth });
    doc.moveDown(0.8);

    // ─── Helpers ────────────────────────────────────────
    const sectionHeader = (num: string, title: string) => {
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(PAD, y, 3, 14).fill(PINK);
      doc.fontSize(9.5).font("MontBold").fillColor(BLACK)
        .text(`${num}  ${title}`, PAD + 10, y + 1, { width: contentWidth - 10 });
      doc.moveDown(0.3);
    };

    const fieldRow = (label: string, value: string, opts?: { halfWidth?: boolean; xOffset?: number }) => {
      const w = opts?.halfWidth ? halfWidth : contentWidth;
      const x = PAD + (opts?.xOffset || 0);
      const y = doc.y;

      doc.rect(x, y, w, 26).fill(LIGHT_BG);
      doc.rect(x, y, w, 26).strokeColor("#e0e0e0").lineWidth(0.5).stroke();
      doc.fontSize(6).font("Mont").fillColor(GRAY).text(label, x + 6, y + 3, { width: w - 12 });
      doc.fontSize(9).font("Mont").fillColor(BLACK).text(value, x + 6, y + 13, { width: w - 12 });

      if (!opts?.halfWidth) doc.y = y + 26;
      return y;
    };

    // ─── 1 Beherbergungsstätte ──────────────────────────
    sectionHeader("1", "Beherbergungsstätte");
    fieldRow("Name", `STACEY ${data.locationName}`);
    fieldRow("Anschrift", accommodationAddress);

    // ─── 2 Aufenthalt ───────────────────────────────────
    sectionHeader("2", "Aufenthalt");
    const dateY = doc.y;
    fieldRow("Ankunft", formatDateGerman(data.arrivalDate), { halfWidth: true });
    doc.y = dateY;
    fieldRow("Voraussichtliche Abreise", formatDateGerman(data.departureDate), { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = dateY + 26;

    // ─── 3 Gast ─────────────────────────────────────────
    sectionHeader("3", "Gast (meldepflichtige Person)");
    const nameY = doc.y;
    fieldRow("Familienname", data.lastName, { halfWidth: true });
    doc.y = nameY;
    fieldRow("Vornamen", data.firstName, { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = nameY + 26;

    const dobY = doc.y;
    fieldRow("Geburtsdatum", formatDateGerman(data.dateOfBirth), { halfWidth: true });
    doc.y = dobY;
    fieldRow("Staatsangehörigkeit", data.nationality, { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = dobY + 26;

    fieldRow("Anschrift (Hauptwohnung)", `${data.street}, ${data.zipCode} ${data.city}, ${data.country}`);

    const idY = doc.y;
    fieldRow("Ausweisdokument", data.idDocumentType === "passport" ? "Reisepass" : "Personalausweis", { halfWidth: true });
    doc.y = idY;
    fieldRow("Seriennummer", data.idDocumentNumber, { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = idY + 26;

    // ─── 4 Begleitperson (optional) ─────────────────────
    if (data.companionFirstName && data.companionLastName) {
      sectionHeader("4", "Mitreisende Person");
      const compY = doc.y;
      fieldRow("Familienname", data.companionLastName, { halfWidth: true });
      doc.y = compY;
      fieldRow("Vornamen", data.companionFirstName, { halfWidth: true, xOffset: halfWidth + 8 });
      doc.y = compY + 26;
    }

    // ─── Bestätigung ────────────────────────────────────
    doc.moveDown(0.8);
    doc.fontSize(8).font("Mont").fillColor("#666")
      .text(
        "Der Gast bestätigt hiermit die Richtigkeit der vorstehenden Angaben. Diese Bestätigung wurde elektronisch erteilt.",
        PAD, doc.y, { width: contentWidth, lineGap: 1.5 }
      );

    // ─── Unterschrift-Grid ──────────────────────────────
    const sigLineY = doc.page.height - 75;

    doc.fontSize(9).font("Mont").fillColor(BLACK).text(`Hamburg, ${todayFormatted}`, PAD, sigLineY - 18);
    doc.moveTo(PAD, sigLineY).lineTo(PAD + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Ort, Datum", PAD, sigLineY + 5);

    const rightX = PAD + halfWidth + 8;
    doc.fontSize(9).font("Mont").fillColor(BLACK).text("Elektronisch bestätigt", rightX, sigLineY - 18);
    doc.moveTo(rightX, sigLineY).lineTo(rightX + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Unterschrift des Gastes", rightX, sigLineY + 5);

    // ─── Hinweis ────────────────────────────────────────
    doc.fontSize(6).font("Mont").fillColor("#999")
      .text(
        "Aufbewahrungspflicht: Dieser Meldeschein ist nach Abreise des Gastes ein Jahr aufzubewahren und danach unverzüglich zu vernichten.",
        PAD, sigLineY + 20, { width: contentWidth }
      );

    doc.end();
  });
}
