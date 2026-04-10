"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Bookings" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/rent", label: "Rent" },
  { href: "/admin/deposits", label: "Deposits" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [testMode, setTestMode] = useState<{ enabled: boolean; whitelist: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/test-mode").then((r) => r.ok ? r.json() : null).then(setTestMode).catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background-alt">
      {/* Test mode banner */}
      {testMode?.enabled && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-xs text-yellow-900 text-center">
          <strong>⚠ TEST MODE active</strong> — emails are only sent to: <span className="font-mono">{testMode.whitelist.join(", ")}</span>. All other recipients are silently skipped.
        </div>
      )}

      {/* Top bar */}
      <header className="bg-white border-b border-lightgray sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-bold text-black text-sm tracking-wide">
              STACEY ADMIN
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-[5px] text-sm transition-colors ${
                      isActive
                        ? "bg-black text-white font-semibold"
                        : "text-gray hover:text-black hover:bg-background-alt"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-gray hover:text-black transition-colors"
              target="_blank"
            >
              View site &rarr;
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-gray hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden flex border-t border-lightgray">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-black border-b-2 border-black"
                    : "text-gray"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
