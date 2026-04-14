import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

const VALID_STAY_TYPES = new Set(["LONG", "SHORT"]);

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, name, city, address, stayType } = await request.json();

  if (!slug || !name || !city || !address) {
    return Response.json(
      { error: "slug, name, city, address required" },
      { status: 400 }
    );
  }
  if (!VALID_STAY_TYPES.has(stayType)) {
    return Response.json(
      { error: "stayType must be LONG or SHORT" },
      { status: 400 }
    );
  }

  try {
    const location = await prisma.location.create({
      data: {
        slug: String(slug).trim().toLowerCase(),
        name: String(name).trim(),
        city: String(city).trim(),
        address: String(address).trim(),
        stayType,
      },
    });
    return Response.json({ id: location.id, slug: location.slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unique constraint")) {
      return Response.json({ error: "Slug already in use" }, { status: 409 });
    }
    return Response.json({ error: "Create failed", details: message }, { status: 500 });
  }
}
