import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BookingsPage from "./BookingsPage";

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [bookings, locations] = await Promise.all([
    prisma.booking.findMany({
      include: { location: true, room: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <BookingsPage
      bookings={JSON.parse(JSON.stringify(bookings))}
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
