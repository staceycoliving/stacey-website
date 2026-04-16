import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BookingsPage from "../BookingsPage";

export default async function AdminBookingsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  // Pipeline only shows what's operationally relevant:
  //   - PENDING (Leads): last 60 days only — older leads are dead weight.
  //     They stay in the DB for future retargeting, just not in the Kanban.
  //   - DEPOSIT_PENDING: always — 48h lifespan, self-cleans via cron.
  //   - CONFIRMED: only if moveInDate >= today. Once moved in the tenant
  //     lives in /admin/tenants.
  //   - CANCELLED: last 30 days — keep recent decisions, not a 5-year archive.
  //   - SIGNED / PAID (legacy enum values): always, in case old rows exist.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadCutoff = new Date(today.getTime() - 60 * 86_400_000);
  const cancelledCutoff = new Date(today.getTime() - 30 * 86_400_000);

  const [bookings, locations, allNotes] = await Promise.all([
    prisma.booking.findMany({
      where: {
        stayType: "LONG",
        OR: [
          { status: "PENDING", createdAt: { gte: leadCutoff } },
          { status: "DEPOSIT_PENDING" },
          { status: { in: ["SIGNED", "PAID"] } },
          { status: "CONFIRMED", moveInDate: { gte: today } },
          { status: "CANCELLED", updatedAt: { gte: cancelledCutoff } },
        ],
      },
      include: {
        location: true,
        room: true,
        tenant: { select: { id: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.location.findMany({
      where: { stayType: "LONG" },
      orderBy: { name: "asc" },
    }),
    // Load all booking-scoped notes in a single query. We slice them per
    // booking on the client — cheaper than N+1.
    prisma.teamNote.findMany({
      where: { bookingId: { not: null } },
      orderBy: [{ sticky: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  // Group notes by bookingId for O(1) lookup on the client
  const notesByBooking: Record<string, typeof allNotes> = {};
  for (const n of allNotes) {
    if (!n.bookingId) continue;
    (notesByBooking[n.bookingId] ??= []).push(n);
  }

  // KPIs are computed on the server to keep the client component pure
  // (React Compiler in Next.js 16 rejects impure calls like Date.now() in
  // useMemo). Date.now() here is fine — this is a Server Component.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const day = 86_400_000;
  const dow = (today.getDay() + 6) % 7;
  const weekStart = new Date(today.getTime() - dow * day);
  const weekEnd = new Date(weekStart.getTime() + 7 * day);
  const in4Weeks = new Date(today.getTime() + 28 * day);

  const kpis = {
    depositSoon: bookings.filter((b) => {
      if (b.status !== "DEPOSIT_PENDING" || !b.depositDeadline) return false;
      const deadline = new Date(b.depositDeadline).getTime();
      return deadline > nowMs && deadline - nowMs <= 24 * 3_600_000;
    }).length,
    depositOverdue: bookings.filter(
      (b) =>
        b.status === "DEPOSIT_PENDING" &&
        b.depositDeadline !== null &&
        new Date(b.depositDeadline).getTime() < nowMs
    ).length,
    moveInsThisWeek: bookings.filter((b) => {
      if (b.status !== "CONFIRMED" || !b.moveInDate) return false;
      const d = new Date(b.moveInDate);
      return d >= weekStart && d < weekEnd;
    }).length,
    moveInsNext4Weeks: bookings.filter((b) => {
      if (b.status !== "CONFIRMED" || !b.moveInDate) return false;
      const d = new Date(b.moveInDate);
      return d >= today && d < in4Weeks;
    }).length,
    staleLeads: bookings.filter(
      (b) =>
        b.status === "PENDING" &&
        nowMs - new Date(b.createdAt).getTime() > 14 * day
    ).length,
    // Data-integrity check: CONFIRMED means deposit paid → a Tenant row
    // should have been created by the webhook. If it's null, something
    // went wrong and we need to investigate.
    confirmedWithoutTenant: bookings.filter(
      (b) => b.status === "CONFIRMED" && !b.tenant
    ).length,
  };

  return (
    <BookingsPage
      bookings={JSON.parse(JSON.stringify(bookings))}
      locations={JSON.parse(JSON.stringify(locations))}
      kpis={kpis}
      notesByBooking={JSON.parse(JSON.stringify(notesByBooking))}
    />
  );
}
