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

  const [bookings, locations] = await Promise.all([
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
  ]);

  return (
    <BookingsPage
      bookings={JSON.parse(JSON.stringify(bookings))}
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
