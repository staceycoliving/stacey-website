// TEMPORARY — verify Sentry capture pipeline. Delete after one successful test.
import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { reportError } from "@/lib/observability";

export async function GET(request: NextRequest) {
  // Gate behind cron secret so only operators can trigger it
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    throw new Error("Sentry verification test — safe to ignore");
  } catch (err) {
    reportError(err, {
      scope: "sentry-test",
      tags: { triggered_by: "manual-verify" },
    });
    return Response.json({ ok: true, sent: "Sentry should now show this issue" });
  }
}
