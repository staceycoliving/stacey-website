"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Consistent breadcrumb trail for all admin pages.
 * First segment = always "Admin" (links to /admin). Remaining segments
 * provided by the page. Last segment is plain text (current location).
 *
 * <Breadcrumbs items={[
 *   { label: "Tenants", href: "/admin/tenants" },
 *   { label: "Mühlenkamp" },
 *   { label: "Matteo Hoch" },
 * ]} />
 */
export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ label: "Admin", href: "/admin" }, ...items];
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-gray flex-wrap print:hidden"
    >
      {all.map((c, i) => {
        const isLast = i === all.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-gray/60" />}
            {c.href && !isLast ? (
              <Link href={c.href} className="hover:text-black">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? "text-black" : ""}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
