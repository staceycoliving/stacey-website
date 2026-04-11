// Shared infrastructure for all email templates: Resend wrapper that respects
// the TEST_MODE_EMAILS whitelist, layout/detailRow HTML helpers, and category
// name + date formatters.

import { Resend } from "resend";
import { canSendEmail, logSkipped } from "@/lib/test-mode";
import { env } from "@/lib/env";

const resendClient = new Resend(env.RESEND_API_KEY);

export const FROM = "STACEY Coliving <booking@stacey.de>";
export const TEAM_EMAIL = "booking@stacey.de";

// Wrapper that respects TEST_MODE_EMAILS whitelist
export const resend = {
  emails: {
    send: async (params: Parameters<typeof resendClient.emails.send>[0]) => {
      const to = Array.isArray(params.to) ? params.to[0] : params.to;
      if (!canSendEmail(to as string)) {
        logSkipped(to as string, params.subject || "(no subject)");
        return { data: { id: "test-mode-skipped" }, error: null };
      }
      return resendClient.emails.send(params);
    },
  },
};

// Category enum → human-readable name
const CATEGORY_NAMES: Record<string, string> = {
  BASIC_PLUS: "Basic+",
  MIGHTY: "Mighty",
  PREMIUM: "Premium",
  PREMIUM_PLUS: "Premium+",
  PREMIUM_BALCONY: "Premium Balcony",
  PREMIUM_PLUS_BALCONY: "Premium+ Balcony",
  JUMBO: "Jumbo",
  JUMBO_BALCONY: "Jumbo Balcony",
  STUDIO: "Studio",
  DUPLEX: "Duplex",
};

export function categoryName(cat: string): string {
  return CATEGORY_NAMES[cat] || cat;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Shared HTML Layout ─────────────────────────────────────

export function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:5px;overflow:hidden;">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <span style="color:#FCB0C0;font-size:22px;font-weight:700;letter-spacing:1px;">STACEY</span>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#FAFAFA;font-size:13px;color:#888;text-align:center;">
      STACEY Coliving · stacey.de<br>
      Our members call us home.
    </div>
  </div>
</body>
</html>`;
}

export function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}
