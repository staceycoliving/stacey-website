import { isAuthenticated } from "@/lib/admin-auth";
import { env } from "@/lib/env";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const whitelist = env.TEST_MODE_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
  return Response.json({
    enabled: whitelist.length > 0,
    whitelist,
  });
}
