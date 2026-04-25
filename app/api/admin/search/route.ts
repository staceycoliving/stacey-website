import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/search?q=<query>
 *
 * Quick jump across admin entities. Searches tenants (name, email),
 * bookings (name, email), and rooms (number). Returns up to 15 results
 * total, prioritising tenants because that's the most common jump.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const [tenants, bookings, rooms] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        moveOut: true,
        room: {
          select: {
            roomNumber: true,
            apartment: { select: { location: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
    }),

    prisma.booking.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
        tenant: null, // skip bookings that already became tenants (dup noise)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        moveInDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    prisma.room.findMany({
      where: {
        roomNumber: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        roomNumber: true,
        category: true,
        apartment: {
          select: {
            id: true,
            location: { select: { id: true, name: true } },
          },
        },
      },
      take: 5,
    }),
  ]);

  const results = [
    ...tenants.map((t) => ({
      kind: "tenant" as const,
      id: t.id,
      title: `${t.firstName} ${t.lastName}`,
      sub: [
        t.email,
        t.room
          ? `${t.room.apartment.location.name} · #${t.room.roomNumber}`
          : null,
        t.moveOut ? `leaves ${new Date(t.moveOut).toLocaleDateString("de-DE")}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/tenants/${t.id}`,
    })),
    ...bookings.map((b) => ({
      kind: "booking" as const,
      id: b.id,
      title: `${b.firstName} ${b.lastName}`,
      sub: [
        b.email,
        b.status,
        b.moveInDate
          ? `move-in ${new Date(b.moveInDate).toLocaleDateString("de-DE")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/bookings`, // bookings list, anchoring/filtering comes later
    })),
    ...rooms.map((r) => ({
      kind: "room" as const,
      id: r.id,
      title: `${r.apartment.location.name} · #${r.roomNumber}`,
      sub: r.category.replace(/_/g, " "),
      href: `/admin/rooms?location=${r.apartment.location.id}`,
    })),
  ];

  return Response.json({ results });
}
