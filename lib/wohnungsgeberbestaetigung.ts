import PDFDocument from "pdfkit";
import { readFile } from "fs/promises";
import path from "path";

// ─── Eigentümer pro Location ────────────────────────────────

const OWNERS: Record<string, { name: string; address: string }> = {
  muehlenkamp: {
    name: "M DQuadrat Immobilien GmbH",
    address: "Brooktorkai 7, 20457 Hamburg",
  },
  eimsbuettel: {
    name: "M DQuadrat Immobilien GmbH",
    address: "Brooktorkai 7, 20457 Hamburg",
  },
  eppendorf: {
    name: "M DQuadrat Immobilien GmbH",
    address: "Brooktorkai 7, 20457 Hamburg",
  },
  "st-pauli": {
    name: "Neda und Dr. Hamid Mofid",
    address: "Giesestraße 54, 22607 Hamburg",
  },
  mitte: {
    name: "Covivio Immobilien GmbH",
    address: "Essener Straße 66, 46047 Oberhausen",
  },
  vallendar: {
    name: "Dr. Andrea Kreidler",
    address: "St. Benedicstraße 8, 20149 Hamburg",
  },
};

const LOCATION_INFO: Record<string, { street: string; plz: string }> = {
  muehlenkamp: { street: "Dorotheenstraße 3-5", plz: "22301 Hamburg" },
  eimsbuettel: { street: "Eppendorfer Weg 270", plz: "20251 Hamburg" },
  "st-pauli": { street: "Detlev-Bremer-Straße 2", plz: "20359 Hamburg" },
  eppendorf: { street: "Bei der Apostelkirche 13", plz: "20257 Hamburg" },
  mitte: { street: "Fischerinsel 13-15", plz: "10179 Berlin" },
  vallendar: { street: "Löhrstraße 54", plz: "56179 Vallendar" },
};

const WOHNUNGSGEBER = {
  name: "Stacey Real Estate GmbH",
  address: "Brooktorkai 7, 20457 Hamburg",
};

const PINK = "#FCB0C0";
const BLACK = "#1A1A1A";
const GRAY = "#888888";
const LIGHT_BG = "#FAFAFA";

interface Person {
  firstName: string;
  lastName: string;
}

interface WohnungsgeberbestaetigungData {
  persons: Person[]; // 1 or 2 persons
  moveInDate: string;
  roomNumber: string;
  locationSlug: string;
  floor?: string;
  buildingAddress?: string;
}

function formatDateGerman(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export async function generateWohnungsgeberbestaetigung(
  data: WohnungsgeberbestaetigungData
): Promise<Buffer> {
  const owner = OWNERS[data.locationSlug];
  const locInfo = LOCATION_INFO[data.locationSlug];

  if (!owner || !locInfo) {
    throw new Error(`Unknown location slug: ${data.locationSlug}`);
  }

  const signatureImage = await readFile(path.join(process.cwd(), "lib/assets/unterschrift.jpeg"));
  const logoPath = path.join(process.cwd(), "lib/assets/stacey-logo-pink.png");
  const fontRegular = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Regular.ttf");
  const fontBold = path.join(process.cwd(), "lib/assets/fonts/Montserrat-Bold.ttf");

  const street = data.buildingAddress || locInfo.street;

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
      .text("Wohnungsgeberbestätigung", PAD, doc.y, { width: contentWidth });
    doc.fontSize(9).font("Mont").fillColor(GRAY)
      .text("nach § 19 des Bundesmeldegesetzes (BMG)", PAD, doc.y, { width: contentWidth });
    doc.moveDown(0.5);

    doc.fontSize(6.5).font("Mont").fillColor("#666")
      .text(
        "Ab dem 01.11.2015 muss der Wohnungsgeber jeder meldepflichtigen Person eine Wohnungsgeberbestätigung aushändigen, damit diese innerhalb von zwei Wochen nach dem Umzug ihrer gesetzlichen Meldepflicht nachkommen können. Bei der Anmeldung des neuen Wohnsitzes ist diese Wohnungsgeberbestätigung bei der Meldebehörde vorzulegen (der Mietvertrag reicht nicht aus). Sollte die meldepflichtige Person in eine eigene Immobilie ziehen, so ist bei der Anmeldung eine Selbsterklärung abzugeben. Der Auszug ist, z.B. bei Wegzug in das Ausland, durch den Wohnungsgeber zu bestätigen.",
        PAD, doc.y, { lineGap: 1.5, width: contentWidth }
      );
    doc.moveDown(0.6);

    // ─── Helpers ────────────────────────────────────────

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

    // ─── 1 Wohnung ──────────────────────────────────────
    sectionHeader("1", "Wohnung");
    doc.fontSize(7).font("Mont").fillColor("#666")
      .text("Hiermit wird der Einzug in folgender Wohnung bestätigt:", PAD, doc.y, { width: contentWidth });
    doc.moveDown(0.2);

    fieldRow("Straße, Hausnummer", street);
    fieldRow("Stockwerk, Lagebeschreibung", data.floor || `Zimmer ${data.roomNumber}`);
    fieldRow("PLZ, Ort", locInfo.plz);

    // ─── 2 Datum ────────────────────────────────────────
    sectionHeader("2", "Datum des Einzugs");
    fieldRow("Datum des Einzugs", formatDateGerman(data.moveInDate));

    // ─── 3 Meldepflichtige Personen ─────────────────────
    sectionHeader("3", "Meldepflichtige Personen");
    doc.fontSize(7).font("Mont").fillColor("#666")
      .text("Diese Bestätigung gilt für folgende Personen:", PAD, doc.y, { width: contentWidth });
    doc.moveDown(0.2);

    if (data.persons.length === 1) {
      fieldRow("Name, Vorname", `${data.persons[0].lastName}, ${data.persons[0].firstName}`);
    } else {
      // Two persons side by side
      const pY = doc.y;
      fieldRow("Name, Vorname", `${data.persons[0].lastName}, ${data.persons[0].firstName}`, { halfWidth: true });
      doc.y = pY;
      fieldRow("Name, Vorname", `${data.persons[1].lastName}, ${data.persons[1].firstName}`, { halfWidth: true, xOffset: halfWidth + 8 });
      doc.y = pY + 26;
    }

    // ─── 4 Wohnungsgeber ────────────────────────────────
    sectionHeader("4", "Wohnungsgeber");
    fieldRow("Name / Bezeichnung", WOHNUNGSGEBER.name);
    fieldRow("Anschrift", WOHNUNGSGEBER.address);

    doc.moveDown(0.2);
    doc.fontSize(7).font("Mont").fillColor("#666")
      .text("Wenn der Wohnungsgeber nicht der Eigentümer ist, Name und Anschrift des Eigentümers:", PAD, doc.y, { width: contentWidth });
    doc.moveDown(0.2);

    fieldRow("Eigentümer", owner.name);
    fieldRow("Anschrift des Eigentümers", owner.address);

    // ─── Gesetzlicher Hinweis ───────────────────────────
    doc.moveDown(0.5);
    doc.fontSize(6).font("Mont").fillColor("#999")
      .text(
        "Es ist verboten, eine Wohnungsanschrift für eine Anmeldung anzubieten oder zur Verfügung zu stellen, wenn ein tatsächlicher Bezug der Wohnung weder stattfindet noch beabsichtigt ist. Ein Verstoß gegen dieses Verbot stellt eine Ordnungswidrigkeit dar und kann mit einer Geldbuße bis zu 50.000 Euro geahndet werden. Das Unterlassen einer Bestätigung des Ein- oder Auszugs sowie die falsche oder nicht rechtzeitige Bestätigung des Ein- oder Auszugs können als Ordnungswidrigkeiten mit Geldbußen bis zu 1.000 Euro geahndet werden.",
        PAD, doc.y, { lineGap: 1.5, width: contentWidth }
      );

    // ─── Unterschrift Grid (2 Spalten), fest unten auf der Seite ──
    const sigLineY = doc.page.height - 75;

    // Linke Spalte: Ort, Datum
    doc.fontSize(9).font("Mont").fillColor(BLACK).text(`Hamburg, ${todayFormatted}`, PAD, sigLineY - 18);
    doc.moveTo(PAD, sigLineY).lineTo(PAD + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Ort, Datum", PAD, sigLineY + 5);

    // Rechte Spalte: Unterschrift
    const rightX = PAD + halfWidth + 8;
    doc.image(signatureImage, rightX, sigLineY - 50, { width: 150 });
    doc.moveTo(rightX, sigLineY).lineTo(rightX + halfWidth, sigLineY).strokeColor("#ccc").lineWidth(0.5).stroke();
    doc.fontSize(7).font("Mont").fillColor(GRAY).text("Unterschrift des Wohnungsgebers", rightX, sigLineY + 5);

    doc.end();
  });
}
