import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
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

  // Allow the login page to render without auth
  return authed ? <AdminShell>{children}</AdminShell> : children;
}
