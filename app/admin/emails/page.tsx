import { isAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import EmailsPage from "./EmailsPage";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [emails, tenants] = await Promise.all([
    prisma.sentEmail.findMany({
      orderBy: { sentAt: "desc" },
      take: 500, // cap — we rotate the log ourselves if it grows
    }),
    // For the "send one now" quick-send box — list of tenants by name.
    prisma.tenant.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <EmailsPage
      emails={JSON.parse(JSON.stringify(emails))}
      tenants={tenants.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
      }))}
    />
  );
}
