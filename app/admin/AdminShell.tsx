"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, User, FileText, Home } from "lucide-react";
import { ToastProvider } from "@/components/admin/ui";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/occupancy", label: "Occupancy" },
  { href: "/admin/housekeeping", label: "Housekeeping" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/audit", label: "Audit" },
];

export default function AdminShell({
  children,
  testMode,
}: {
  children: React.ReactNode;
  testMode?: { enabled: boolean; whitelist: string[] };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-background-alt">
      {/* Test mode banner */}
      {testMode?.enabled && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-xs text-yellow-900 text-center">
          <strong>⚠ TEST MODE active</strong>, emails are only sent to: <span className="font-mono">{testMode.whitelist.join(", ")}</span>. All other recipients are silently skipped.
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
                const isActive = item.exact
                  ? pathname === item.href
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
            <QuickSearch />
            <Link
              href="/"
              className="text-xs text-gray hover:text-black transition-colors hidden md:inline"
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
            const isActive = item.exact
              ? pathname === item.href
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
    </ToastProvider>
  );
}

type SearchResult = {
  kind: "tenant" | "booking" | "room";
  id: string;
  title: string;
  sub: string;
  href: string;
};

/** Global quick-jump, Cmd/Ctrl+K or click. Hits /api/admin/search with a
 *  debounced query; arrow keys navigate, Enter jumps. Closes on outside
 *  click or Escape. */
function QuickSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q.trim())}`,
          { signal: ac.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setActiveIdx(0);
        }
      } catch {
        /* aborted or network error, silent */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  // Global keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      navigate(results[activeIdx]);
    }
  }

  function navigate(r: SearchResult) {
    setOpen(false);
    setQ("");
    router.push(r.href);
  }

  const showDropdown =
    open && (q.trim().length >= 2 || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search…"
          className="w-40 sm:w-56 pl-7 pr-10 py-1.5 text-sm border border-lightgray rounded-[5px] bg-white focus:outline-none focus:border-black"
        />
        <kbd className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray bg-background-alt border border-lightgray rounded px-1 py-0.5 font-mono">
          ⌘K
        </kbd>
      </div>
      {showDropdown && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-lightgray rounded-[5px] shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && q.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray text-center">
              Searching…
            </div>
          )}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray text-center">
              No matches for &ldquo;{q}&rdquo;
            </div>
          )}
          {results.length > 0 && (
            <div className="divide-y divide-lightgray">
              {results.map((r, idx) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => navigate(r)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 ${
                    idx === activeIdx ? "bg-background-alt" : "hover:bg-background-alt/50"
                  }`}
                >
                  <ResultIcon kind={r.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-black truncate">
                      {r.title}
                    </div>
                    {r.sub && (
                      <div className="text-[11px] text-gray truncate">
                        {r.sub}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultIcon({ kind }: { kind: SearchResult["kind"] }) {
  const cls = "w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray";
  if (kind === "tenant") return <User className={cls} />;
  if (kind === "booking") return <FileText className={cls} />;
  return <Home className={cls} />;
}
