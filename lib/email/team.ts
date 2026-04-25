import { sendTrackedEmail, FROM, TEAM_EMAIL, internalLayout, detailRow, detailTable, badge, ctaButton, categoryName, formatDate, type SendMeta } from "./_shared";

type Meta = Omit<SendMeta, "templateKey"> | undefined;
import { env } from "@/lib/env";

interface TeamNotification {
  stayType: "SHORT" | "LONG";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  locationName: string;
  category: string;
  persons: number;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  moveInDate?: string;
  bookingId: string;
  depositAmount?: number; // in cents, only for deposit-confirmed notifications
}

export async function sendTeamNotification(booking: TeamNotification, meta?: Meta) {
  const isShort = booking.stayType === "SHORT";
  const dateRows = isShort
    ? detailRow("Check-in", formatDate(booking.checkIn!)) +
      detailRow("Check-out", formatDate(booking.checkOut!)) +
      detailRow("Nights", String(booking.nights))
    : detailRow("Move-in", formatDate(booking.moveInDate!));

  const depositRow = booking.depositAmount
    ? detailRow("Deposit", `€${(booking.depositAmount / 100).toFixed(2)} ✓`, { highlight: "green" })
    : "";

  const badgeText = booking.depositAmount ? "New confirmed move-in" : "New booking";
  const title = booking.depositAmount ? "Deposit paid, move-in confirmed" : `New ${isShort ? "booking" : "move-in request"}`;

  const html = internalLayout(`
    ${badge(badgeText, "green")}
    <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;">${title}</h2>
    ${detailTable(
      detailRow("Name", `${booking.firstName} ${booking.lastName}`) +
      detailRow("Email", `<a href="mailto:${booking.email}" style="color:#1A1A1A;">${booking.email}</a>`) +
      detailRow("Phone", booking.phone || ",") +
      detailRow("Location", `STACEY ${booking.locationName}`) +
      detailRow("Type", isShort ? "SHORT Stay" : "LONG Stay") +
      detailRow("Room", categoryName(booking.category)) +
      detailRow("Persons", String(booking.persons)) +
      dateRows +
      depositRow +
      detailRow("Booking ID", `<code style="font-size:12px;background:#eee;padding:2px 6px;border-radius:3px;">${booking.bookingId}</code>`)
    )}
    ${ctaButton("Open Admin Dashboard", `${env.NEXT_PUBLIC_BASE_URL}/admin`)}
  `);

  return sendTrackedEmail(
    {
      from: FROM,
      to: TEAM_EMAIL,
      subject: `[${isShort ? "SHORT" : "LONG"}] ${booking.firstName} ${booking.lastName}, STACEY ${booking.locationName}`,
      html,
    },
    { templateKey: "team_notification", bookingId: booking.bookingId, ...meta }
  );
}
