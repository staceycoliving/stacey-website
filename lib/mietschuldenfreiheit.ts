import PDFDocument from "pdfkit";
import { readFile } from "fs/promises";
import path from "path";

const PINK = "#FCB0C0";
const BLACK = "#1A1A1A";
const GRAY = "#888888";
const LIGHT_BG = "#FAFAFA";

interface MietschuldenfreiheitData {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  locationName: string;
  locationAddress: string;
  roomNumber: string;
  apartmentLabel: string;
  moveIn: string;
  moveOut: string | null;
  totalPaid: number; // Cent
  totalDue: number; // Cent
  openBalance: number; // Cent (totalDue - totalPaid)
}

function formatDateGerman(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function formatEuro(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export async function generateMietschuldenfreiheitsbescheinigung(
  data: MietschuldenfreiheitData
): Promise<Buffer> {
  const signatureImage = await readFile(path.join(process.cwd(), "lib/assets/unterschrift.jpeg"));
  const logoPath = path.join(process.cwd(), "lib/assets/stacey-logo-pink.png");
  const fontRegular = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Regular.ttf");
  const fontBold = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Bold.ttf");

  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, bottom: 40, left: 50, right: 50 },
      font: fontRegular,
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

    // Header
    try {
      doc.image(logoPath, PAD, 35, { height: 20 });
    } catch {
      doc.fontSize(18).font("MontBold").fillColor(PINK).text("STACEY", PAD, 35);
    }
    doc.rect(0, 68, W, 2).fill(PINK);
    doc.y = 90;

    // Title
    doc.fontSize(16).font("MontBold").fillColor(BLACK)
      .text("Mietschuldenfreiheitsbescheinigung", PAD, doc.y, { width: contentWidth });
    doc.fontSize(9).font("Mont").fillColor(GRAY)
      .text("Bestätigung über den Stand der Miet- und Nebenkostenzahlungen", PAD, doc.y, { width: contentWidth });
    doc.moveDown(1);

    // Intro
    const isClear = data.openBalance <= 0;
    doc.fontSize(9).font("Mont").fillColor(BLACK).text(
      "Hiermit bestätigen wir, dass für die nachstehend aufgeführte meldepflichtige Person zum Zeitpunkt der Ausstellung dieser Bescheinigung die folgenden Miet- und Nebenkostenverhältnisse bestehen:",
      PAD,
      doc.y,
      { lineGap: 2, width: contentWidth }
    );
    doc.moveDown(0.6);

    // Helper
    const sectionHeader = (num: string, title: string) => {
      doc.moveDown(0.4);
      const y = doc.y;
      doc.rect(PAD, y, 3, 14).fill(PINK);
      doc.fontSize(9.5).font("MontBold").fillColor(BLACK)
        .text(`${num}  ${title}`, PAD + 10, y + 1, { width: contentWidth - 10 });
      doc.moveDown(0.2);
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

    // 1 Mieter
    sectionHeader("1", "Mieter");
    const pY = doc.y;
    fieldRow("Name, Vorname", `${data.lastName}, ${data.firstName}`, { halfWidth: true });
    doc.y = pY;
    fieldRow("Geburtsdatum", formatDateGerman(data.dateOfBirth), { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = pY + 26;

    // 2 Wohnung
    sectionHeader("2", "Wohnung");
    fieldRow("Objekt", `${data.locationName} · ${data.apartmentLabel} · Zimmer ${data.roomNumber}`);
    fieldRow("Anschrift", data.locationAddress);

    // 3 Mietzeitraum
    sectionHeader("3", "Mietzeitraum");
    const mY = doc.y;
    fieldRow("Mietbeginn", formatDateGerman(data.moveIn), { halfWidth: true });
    doc.y = mY;
    fieldRow(
      data.moveOut ? "Mietende" : "Mietende (geplant)",
      formatDateGerman(data.moveOut),
      { halfWidth: true, xOffset: halfWidth + 8 }
    );
    doc.y = mY + 26;

    // 4 Stand
    sectionHeader("4", "Stand der Zahlungen");
    const sY = doc.y;
    fieldRow("Geleistete Zahlungen", formatEuro(data.totalPaid), { halfWidth: true });
    doc.y = sY;
    fieldRow("Offene Forderungen", formatEuro(Math.max(0, data.openBalance)), { halfWidth: true, xOffset: halfWidth + 8 });
    doc.y = sY + 26;

    // Statement
    doc.moveDown(0.5);
    if (isClear) {
      doc.rect(PAD, doc.y, contentWidth, 40).fill("#E8F5E9");
      const statementY = doc.y + 10;
      doc.fontSize(10).font("MontBold").fillColor("#2E7D32")
        .text(
          "Es bestehen keine offenen Mietzahlungen oder Nebenkostenforderungen.",
          PAD + 12,
          statementY,
          { width: contentWidth - 24 }
        );
      doc.y += 40;
    } else {
      doc.rect(PAD, doc.y, contentWidth, 48).fill("#FFEBEE");
      const statementY = doc.y + 10;
      doc.fontSize(10).font("MontBold").fillColor("#C62828")
        .text(
          `Es bestehen offene Forderungen in Höhe von ${formatEuro(data.openBalance)}.`,
          PAD + 12,
          statementY,
          { width: contentWidth - 24 }
        );
      doc.y += 48;
    }

    // Footer note
    doc.moveDown(0.5);
    doc.fontSize(7).font("Mont").fillColor("#666").text(
      "Diese Bescheinigung wird auf Anfrage des Mieters ausgestellt und bestätigt den Stand der Zahlungen zum oben genannten Datum. Eine Garantie für zukünftige Zahlungen ist hiermit nicht verbunden.",
      PAD, doc.y, { lineGap: 1.5, width: contentWidth }
    );

    // Signature
    const sigLineY = doc.page.height - 75;
    doc.fontSize(9).font("Mont").fillColor(BLACK).text(`Hamburg, ${todayFormatted}`, PAD, sigLineY - 18);
    doc.moveTo(PAD, sigLineY).lineTo(PAD + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Ort, Datum", PAD, sigLineY + 5);

    const rightX = PAD + halfWidth + 8;
    doc.image(signatureImage, rightX, sigLineY - 50, { width: 150 });
    doc.moveTo(rightX, sigLineY).lineTo(rightX + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Stacey Real Estate GmbH", rightX, sigLineY + 5);

    doc.end();
  });
}
