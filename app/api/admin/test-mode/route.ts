import { isAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = process.env.TEST_MODE_EMAILS || "";
  const whitelist = raw.split(",").map((e) => e.trim()).filter(Boolean);
  return Response.json({
    enabled: whitelist.length > 0,
    whitelist,
  });
}
