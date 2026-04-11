import { isAuthenticated } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import AdminShell from "./AdminShell";

export const metadata = {
  title: "STACEY Admin",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  // Read test mode status server-side (env var available at render time)
  const whitelist = env.TEST_MODE_EMAILS.split(",").map((e) => e.trim()).filter(Boolean);
  const testMode = { enabled: whitelist.length > 0, whitelist };

  // Allow the login page to render without auth
  return authed ? <AdminShell testMode={testMode}>{children}</AdminShell> : children;
}
