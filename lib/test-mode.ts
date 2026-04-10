/**
 * Test Mode: gate cron-triggered emails to a whitelist of test addresses.
 *
 * Set env var TEST_MODE_EMAILS="email1@example.com,email2@example.com"
 * to enable. While set, only these recipients will receive cron emails.
 *
 * To disable test mode (production): unset TEST_MODE_EMAILS in Vercel.
 */

const RAW = process.env.TEST_MODE_EMAILS || "";
const WHITELIST = RAW.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const ENABLED = WHITELIST.length > 0;

export function isTestMode(): boolean {
  return ENABLED;
}

export function canSendEmail(toEmail: string): boolean {
  if (!ENABLED) return true; // Test mode off → allow all
  return WHITELIST.includes(toEmail.toLowerCase());
}

export function logSkipped(toEmail: string, context: string) {
  console.log(`[TEST_MODE] Skipped ${context} for ${toEmail} (not in whitelist)`);
}
