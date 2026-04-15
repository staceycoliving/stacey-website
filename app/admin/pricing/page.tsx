import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import PricingPage from "./PricingPage";

export const dynamic = "force-dynamic";

/** Shape passed to the client:
 *  one row per (location, roomCategory) pair with the current price
 *  and a count of rooms on it. If different rooms somehow diverge on
 *  price within a category, we surface a `mixed: true` flag so the
 *  admin can spot data drift. */
export default async function AdminPricingPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const locations = await prisma.location.findMany({
    where: {
      stayType: "LONG", // price editor only makes sense for LONG (we own the DB); SHORT is apaleo
    },
    include: {
      apartments: {
        include: {
          rooms: {
            select: { id: true, category: true, monthlyRent: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Flatten to location → category aggregations.
  const rows = locations.map((loc) => {
    const allRooms = loc.apartments.flatMap((a) => a.rooms);
    // Group by category
    const byCategory = new Map<string, { prices: number[]; count: number }>();
    for (const r of allRooms) {
      const entry = byCategory.get(r.category) ?? { prices: [], count: 0 };
      entry.prices.push(r.monthlyRent);
      entry.count++;
      byCategory.set(r.category, entry);
    }
    const categories = Array.from(byCategory.entries())
      .map(([category, { prices, count }]) => {
        const unique = Array.from(new Set(prices));
        return {
          category,
          currentPrice: unique[0] ?? 0,
          rooms: count,
          mixed: unique.length > 1, // data-drift flag
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));
    return {
      id: loc.id,
      name: loc.name,
      city: loc.city,
      slug: loc.slug,
      categories,
    };
  });

  return <PricingPage locations={rows} />;
}
