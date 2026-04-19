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
      take: 500,
    }),
    prisma.tenant.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  // Resolve tenant name for each recipient — by linked entityId first,
  // then by matching email address (fallback for older logs without
  // tenant linkage).
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const tenantByEmail = new Map(tenants.map((t) => [t.email.toLowerCase(), t]));

  const enriched = emails.map((e) => {
    let matched =
      e.entityType === "tenant" && e.entityId
        ? tenantById.get(e.entityId)
        : null;
    if (!matched) matched = tenantByEmail.get(e.recipient.toLowerCase());
    return {
      ...e,
      tenantId: matched?.id ?? null,
      tenantName: matched
        ? `${matched.firstName} ${matched.lastName}`
        : null,
    };
  });

  return (
    <EmailsPage
      emails={JSON.parse(JSON.stringify(enriched))}
      tenants={tenants.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        email: t.email,
      }))}
    />
  );
}
