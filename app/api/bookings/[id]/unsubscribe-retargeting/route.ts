import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/bookings/[id]/unsubscribe-retargeting
 *
 * Public endpoint hit when a guest clicks the unsubscribe link in a
 * retargeting email. Flips retargetingEligible=false. No auth, the
 * booking ID is the unguessable token. Returns a plain HTML page.
 */
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, firstName: true, retargetingEligible: true },
  });

  if (!booking) {
    return new Response(renderPage("Link ist nicht mehr gültig.", false), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (booking.retargetingEligible) {
    await prisma.booking.update({
      where: { id },
      data: { retargetingEligible: false },
    });
  }

  return new Response(
    renderPage(
      `Erledigt, ${booking.firstName}. Du bekommst keine weiteren Nachfragen zu dieser Anfrage.`,
      true
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function renderPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>STACEY</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
           background:#f5f5f5; margin:0; padding:40px 20px; color:#1A1A1A; }
    .card { max-width: 500px; margin: 40px auto; background:white;
            border-radius: 8px; padding: 32px; text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
    p { color: #555; font-size: 15px; line-height: 1.5; margin: 0; }
    a { color: #1A1A1A; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✓" : ","}</div>
    <h1>${success ? "Abgemeldet" : "Ups"}</h1>
    <p>${message}</p>
    <p style="margin-top:20px;font-size:13px;color:#888;">
      <a href="https://stacey.de">stacey.de</a>
    </p>
  </div>
</body>
</html>`;
}
