import {
  sendTrackedEmail,
  FROM,
  layout,
  detailRow,
  detailTable,
  ctaButton,
  categoryName,
  formatDate,
  type SendMeta,
} from "./_shared";
import { env } from "@/lib/env";

type Meta = Omit<SendMeta, "templateKey"> | undefined;

/**
 * "Still interested?" nudge for PENDING bookings that haven't progressed
 * past lead stage. Sent automatically by the daily cron on day 5 and
 * day 14 if retargetingEligible = true (auto-disabled when booking fee
 * is paid to avoid spamming active customers).
 *
 * The email is soft-touch: no pressure, just a reminder. Includes an
 * unsubscribe link that flips retargetingEligible = false.
 */
interface RetargetingData {
  firstName: string;
  email: string;
  locationName: string;
  category: string;
  moveInDate: string | null;
  bookingId: string;
  daysSinceBooking: number;
  resumeUrl: string;
  unsubscribeUrl: string;
}

export async function sendRetargetingNudge(
  data: RetargetingData,
  meta?: Meta,
) {
  const isFirstNudge = data.daysSinceBooking <= 10;

  const intro = isFirstNudge
    ? `Vor ein paar Tagen hast du eine Anfrage bei uns gestartet für ein Zimmer in STACEY ${data.locationName}. Wir haben noch nichts von dir gehört — läuft alles?`
    : `Falls du noch überlegst: dein Zimmer in STACEY ${data.locationName} ist weiterhin reserviert für dich.`;

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">
      Noch Interesse, ${data.firstName}?
    </h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      ${intro}
    </p>
    ${detailTable(
      detailRow("Location", `STACEY ${data.locationName}`) +
        detailRow("Room", categoryName(data.category)) +
        (data.moveInDate
          ? detailRow("Move-in", formatDate(data.moveInDate))
          : ""),
    )}
    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
      Falls du Fragen hast, schreib uns einfach direkt auf diese E-Mail. Wenn
      du fortsetzen willst, klick auf den Button:
    </p>
    ${ctaButton("Buchung fortsetzen", data.resumeUrl)}
    <p style="margin:24px 0 8px;color:#888;font-size:12px;line-height:1.6;">
      Kein Interesse mehr? Das ist völlig in Ordnung.{" "}
      <a href="${data.unsubscribeUrl}" style="color:#888;text-decoration:underline;">
        Keine weiteren E-Mails zu dieser Anfrage
      </a>.
    </p>
  `);

  return sendTrackedEmail(
    {
      from: FROM,
      to: data.email,
      subject: isFirstNudge
        ? `Noch Interesse an STACEY ${data.locationName}?`
        : `Dein Zimmer bei STACEY ${data.locationName} wartet`,
      html,
    },
    {
      templateKey: "retargeting_nudge",
      bookingId: data.bookingId,
      ...meta,
    },
  );
}

// Ensure the unsubscribe link uses our production URL without leaking env details
export function buildUnsubscribeUrl(bookingId: string): string {
  const base =
    env.NEXT_PUBLIC_BASE_URL || "https://stacey.de";
  return `${base}/api/bookings/${bookingId}/unsubscribe-retargeting`;
}

export function buildResumeUrl(bookingId: string): string {
  const base = env.NEXT_PUBLIC_BASE_URL || "https://stacey.de";
  return `${base}/move-in?resume=${bookingId}`;
}
