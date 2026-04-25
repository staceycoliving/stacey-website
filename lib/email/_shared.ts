// Shared infrastructure for all email templates: Resend wrapper that respects
// the TEST_MODE_EMAILS whitelist, layout/detailRow HTML helpers, and category
// name + date formatters.

import { Resend } from "resend";
import { canSendEmail, logSkipped } from "@/lib/test-mode";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

const resendClient = new Resend(env.RESEND_API_KEY);

export const FROM = "STACEY Coliving <booking@stacey.de>";
export const TEAM_EMAIL = "booking@stacey.de";

// Wrapper that respects TEST_MODE_EMAILS whitelist.
// Returns `skipped: true` so callers can avoid updating DB flags
// (e.g. reminderSentAt) when the email never actually went out.
export const resend = {
  emails: {
    send: async (params: Parameters<typeof resendClient.emails.send>[0]) => {
      const to = Array.isArray(params.to) ? params.to[0] : params.to;
      if (!canSendEmail(to as string)) {
        logSkipped(to as string, params.subject || "(no subject)");
        return { data: { id: "test-mode-skipped" }, error: null, skipped: true as const };
      }
      const result = await resendClient.emails.send(params);
      return { ...result, skipped: false as const };
    },
  },
};

/* ─── Tracked send (with SentEmail logging) ─────────────── */

/** Metadata passed alongside an email send so the SentEmail log entry can
 *  link back to the tenant/booking + distinguish auto vs manual. */
export type SendMeta = {
  /** Canonical template key, e.g. "welcome" / "mahnung1". Required. */
  templateKey: string;
  /** Link log entry to a tenant (entityType=tenant, entityId=tenantId). */
  tenantId?: string | null;
  /** Link log entry to a booking (entityType=booking, entityId=bookingId).
   *  Used when no Tenant exists yet (pre-deposit bookings). */
  bookingId?: string | null;
  /** Human label: "cron_daily" / "webhook_stripe" / "manual_resend" / "auto". */
  triggeredBy?: string;
};

/** Wrapper around `resend.emails.send` that also writes a `SentEmail` log
 *  entry for success, failure, and test-mode skip. Use this from every
 *  template file so the email hub + folio email history have a single
 *  source of truth. */
export async function sendTrackedEmail(
  params: Parameters<typeof resendClient.emails.send>[0],
  meta: SendMeta,
) {
  const to = Array.isArray(params.to) ? params.to[0] : params.to;
  const recipient = String(to ?? "");
  const entityType = meta.tenantId
    ? "tenant"
    : meta.bookingId
      ? "booking"
      : null;
  const entityId = meta.tenantId ?? meta.bookingId ?? null;
  const triggeredBy = meta.triggeredBy ?? "auto";

  // Base log payload, filled with actual result below.
  const base = {
    templateKey: meta.templateKey,
    recipient,
    subject: params.subject ?? null,
    entityType,
    entityId,
    triggeredBy,
  };

  try {
    const result = await resend.emails.send(params);

    // Test-mode skip: log as "skipped" so the admin can see it was
    // intentionally filtered out, without counting it as a success.
    if (result.skipped) {
      await safeLog({
        ...base,
        status: "skipped",
        resendId: null,
        error: null,
      });
      return result;
    }

    // result.error comes from the Resend SDK when non-skipped. TS narrows
    // it to null on the skipped branch, so coerce explicitly.
    const resendError = (result as { error?: unknown }).error;
    if (resendError) {
      await safeLog({
        ...base,
        status: "failed",
        resendId: null,
        error:
          typeof resendError === "string"
            ? resendError
            : JSON.stringify(resendError),
      });
      return result;
    }

    await safeLog({
      ...base,
      status: "sent",
      resendId: result.data?.id ?? null,
      error: null,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await safeLog({
      ...base,
      status: "failed",
      resendId: null,
      error: message,
    });
    throw err; // Preserve existing error-handling at call sites.
  }
}

/** Logging must never break an email send. Swallow DB errors and warn. */
async function safeLog(data: {
  templateKey: string;
  recipient: string;
  subject: string | null;
  entityType: string | null;
  entityId: string | null;
  resendId: string | null;
  status: string;
  error: string | null;
  triggeredBy: string;
}) {
  try {
    await prisma.sentEmail.create({ data });
  } catch (err) {
    console.warn("[SentEmail] log write failed:", err);
  }
}

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

const LOGO_URL = `${env.NEXT_PUBLIC_BASE_URL}/images/stacey-logo-new-white-001.webp`;
const PHONE = "+49 40 696389600";

// ─── Shared HTML Layout ─────────────────────────────────────

/** Standard email layout. Use `accentColor` to set the bar under the header
 *  (default pink gradient, pass "orange" or "red" for warnings/Mahnungen). */
export function layout(
  content: string,
  opts?: { accent?: "pink" | "orange" | "red" },
): string {
  const accent = opts?.accent ?? "pink";
  const accentBar =
    accent === "red"
      ? `<div style="height:4px;background:#e53935;"></div>`
      : accent === "orange"
        ? `<div style="height:4px;background:#ff9800;"></div>`
        : `<div style="height:3px;background:linear-gradient(90deg,#FCB0C0,#f8d0d8,#FCB0C0);"></div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <img src="${LOGO_URL}" alt="Stacey" style="height:28px;display:block;">
    </div>
    ${accentBar}
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:24px 32px;background:#1A1A1A;color:#999;font-size:12px;line-height:1.8;">
      <img src="${LOGO_URL}" alt="Stacey" style="height:20px;display:block;margin-bottom:8px;">
      <div>Our Members Call Us Home.</div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #333;">
        Stacey Real Estate GmbH · Brooktorkai 7, 20457 Hamburg<br>
        <a href="https://stacey.de" style="color:#FCB0C0;text-decoration:none;">stacey.de</a> ·
        <a href="https://stacey.de/impressum" style="color:#999;text-decoration:none;">Impressum</a> ·
        <a href="https://stacey.de/datenschutz" style="color:#999;text-decoration:none;">Datenschutz</a>
      </div>
      <div style="margin-top:8px;color:#666;">Questions? Reply to this email or call <a href="tel:${PHONE}" style="color:#FCB0C0;text-decoration:none;">${PHONE}</a></div>
    </div>
  </div>
</body>
</html>`;
}

/** Internal (team) email layout, simpler footer, no legal info. */
export function internalLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:#1A1A1A;padding:24px 32px;">
      <img src="${LOGO_URL}" alt="Stacey" style="height:28px;display:block;">
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#FCB0C0,#f8d0d8,#FCB0C0);"></div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#FAFAFA;font-size:12px;color:#888;text-align:center;">
      Internal notification · booking@stacey.de
    </div>
  </div>
</body>
</html>`;
}

export function detailRow(label: string, value: string, opts?: { highlight?: "green" | "orange" | "red" }): string {
  const bg = opts?.highlight === "green"
    ? "background:#f0faf0;"
    : opts?.highlight === "orange"
      ? "background:#fff8f0;"
      : opts?.highlight === "red"
        ? "background:#fff5f5;"
        : "";
  const color = opts?.highlight === "green"
    ? "color:#2e7d32;font-weight:700;"
    : opts?.highlight === "orange"
      ? "color:#e65100;font-weight:700;"
      : opts?.highlight === "red"
        ? "color:#c62828;font-weight:700;"
        : "font-weight:500;";
  return `<tr style="${bg}">
    <td style="padding:10px 16px;color:#888;font-size:14px;border-bottom:1px solid #f0f0f0;">${label}</td>
    <td style="padding:10px 16px;font-size:14px;${color}border-bottom:1px solid #f0f0f0;">${value}</td>
  </tr>`;
}

export function badge(text: string, color: "green" | "orange" | "red"): string {
  const colors = {
    green: "background:#e8f5e9;color:#2e7d32;",
    orange: "background:#fff3e0;color:#e65100;",
    red: "background:#ffebee;color:#c62828;",
  };
  return `<div style="display:inline-block;${colors[color]}font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:16px;">${text}</div>`;
}

export function ctaButton(text: string, url: string, color?: "red"): string {
  const bg = color === "red" ? "#c62828" : "#1A1A1A";
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:${bg};color:#fff;padding:16px 40px;border-radius:5px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;letter-spacing:0.5px;">${text}</a>
  </div>`;
}

export function warningBox(text: string, subtext?: string): string {
  return `<div style="background:#fff5f5;border-left:4px solid #e53935;border-radius:5px;padding:14px 16px;margin-bottom:20px;">
    <p style="margin:0;font-size:14px;color:#c62828;font-weight:600;">${text}</p>
    ${subtext ? `<p style="margin:4px 0 0;font-size:13px;color:#888;">${subtext}</p>` : ""}
  </div>`;
}

export function infoBox(text: string, opts?: { pink?: boolean }): string {
  const bg = opts?.pink ? "background:#FFF5F7;border-left:4px solid #FCB0C0;" : "background:#FAFAFA;";
  return `<div style="${bg}border-radius:8px;padding:20px;margin-bottom:16px;">
    ${text}
  </div>`;
}

export function detailTable(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#FAFAFA;border-radius:8px;overflow:hidden;">${rows}</table>`;
}
