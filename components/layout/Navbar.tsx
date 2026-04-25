"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const navCities = [
  {
    name: "Hamburg",
    slug: "hamburg",
    locs: [
      ...locations.filter((l) => l.city === "hamburg" && l.stayType === "SHORT"),
      ...locations.filter((l) => l.city === "hamburg" && l.stayType === "LONG"),
    ],
  },
  { name: "Berlin", slug: "berlin", locs: locations.filter((l) => l.city === "berlin") },
  { name: "Vallendar", slug: "vallendar", locs: locations.filter((l) => l.city === "vallendar") },
];

export default function Navbar({
  transparent = false,
  locationName,
  stayType,
}: {
  transparent?: boolean;
  locationName?: string;
  stayType?: "SHORT" | "LONG";
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [basePrices, setBasePrices] = useState<Record<string, Record<string, number>>>({});
  // Live "just booked" feed — last 24h of committed bookings, used by
  // the rotating activity badge inside the pill. Empty array (no
  // bookings or fetch failure) drops the badge into a heritage fallback.
  const [recentBookings, setRecentBookings] = useState<
    Array<{ location: string; agoMin: number }>
  >([]);
  const [activityIdx, setActivityIdx] = useState(0);

  // Hero-immersive on transparent pages until the user scrolls; then
  // pill chrome materialises. Non-transparent pages (everything off the
  // homepage) start in the chromed state immediately. Opening the
  // mobile drawer also forces chrome — otherwise the transparent pill
  // would sit over the white drawer body with white hamburger lines
  // invisibly.
  const chromed = mobileOpen || drawerVisible || !transparent || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mega-menu price data
  useEffect(() => {
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) setBasePrices(res.data);
      })
      .catch(() => {});
  }, []);

  // Recent booking feed. /api/recent-bookings returns [] on failure, so
  // a single shape covers both success-empty and error states — the
  // badge falls through to the heritage line cleanly.
  useEffect(() => {
    fetch("/api/recent-bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok && Array.isArray(res.data)) setRecentBookings(res.data);
      })
      .catch(() => {});
  }, []);

  // Rotate through bookings every 4s (only when there are >1 entries).
  // Reset to 0 whenever the list changes so a re-fetch doesn't leave
  // the cursor pointing at an out-of-bounds entry.
  useEffect(() => {
    setActivityIdx(0);
    if (recentBookings.length < 2) return;
    const t = setInterval(
      () => setActivityIdx((i) => (i + 1) % recentBookings.length),
      4000,
    );
    return () => clearInterval(t);
  }, [recentBookings]);

  // Mobile drawer body-overflow lock; drawerVisible stays true during the
  // 300ms close slide so the bar doesn't snap to dark mid-animation.
  useEffect(() => {
    if (mobileOpen) {
      setDrawerVisible(true);
      document.body.style.overflow = "hidden";
      return;
    }
    const t = setTimeout(() => {
      document.body.style.overflow = "";
      setDrawerVisible(false);
    }, 300);
    return () => clearTimeout(t);
  }, [mobileOpen]);

  const ctaLabel = locationName
    ? stayType === "SHORT"
      ? "Check in"
      : "Move in"
    : "Move in";

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50">
        {/* Desktop: same flex composition in both states; only the pill
            chrome (background + ring + shadow + max-width) animates in
            on scroll. Hero state = transparent layout floating over the
            hero photo. Scrolled state = floating dark-glass pill. */}
        <div className="hidden px-4 pb-3 pt-3 sm:px-6 lg:block lg:px-8">
          <div
            className={clsx(
              "mx-auto flex items-center justify-between gap-4 px-3 py-2 transition-all duration-500 ease-out",
              chromed
                ? "max-w-4xl rounded-[5px] bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-xl"
                : "max-w-7xl bg-transparent shadow-none ring-0",
            )}
          >
            {/* Logo — smart link (scroll to top on /, navigate elsewhere) */}
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  setMobileOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              className="relative h-9 w-28 shrink-0 transition-transform duration-300 hover:scale-[1.04]"
            >
              <Image
                src={logoHover ? "/images/stacey-logo-new-pink-001.webp" : "/images/stacey-logo-new-white-001.webp"}
                alt="STACEY"
                fill
                className="object-contain object-left"
                sizes="120px"
                priority
              />
            </Link>

            {/* City links + mega menu */}
            <div className="flex items-center gap-1">
              {navCities.map((city) => (
                <div
                  key={city.slug}
                  className="relative"
                  onMouseEnter={() => setMegaOpen(city.slug)}
                  onMouseLeave={() => setMegaOpen(null)}
                >
                  <button className="group flex items-center gap-1 rounded-[4px] px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white">
                    {city.name}
                    <ChevronDown
                      size={11}
                      className={clsx("transition-transform duration-200", megaOpen === city.slug && "rotate-180")}
                    />
                  </button>

                  {megaOpen === city.slug && (
                    <div
                      className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                      style={{ width: "360px" }}
                    >
                      <div className="rounded-[5px] bg-black/85 p-4 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
                          {city.name} · {city.locs.length}{" "}
                          {city.locs.length === 1 ? "location" : "locations"}
                        </p>
                        <div className="space-y-1">
                          {city.locs.map((loc) => (
                            <Link
                              key={loc.slug}
                              href={`/locations/${loc.slug}`}
                              className="flex items-center gap-3 rounded-[5px] p-2 transition-all hover:bg-white/10 hover:pl-3"
                            >
                              <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-[3px]">
                                <Image
                                  src={loc.images[0]}
                                  alt={loc.name}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{loc.name}</p>
                                <p className="text-[11px] text-white/60">
                                  from €
                                  {(() => {
                                    if (loc.stayType === "SHORT" && basePrices[loc.slug]) {
                                      const prices = Object.values(basePrices[loc.slug]);
                                      if (prices.length > 0) return Math.min(...prices);
                                    }
                                    return loc.priceFrom;
                                  })()}
                                  {loc.stayType === "SHORT" ? "/night" : "/mo"}
                                </p>
                              </div>
                              <span
                                className={`rounded-[5px] px-2 py-0.5 text-[9px] font-bold ${
                                  loc.stayType === "SHORT"
                                    ? "bg-white text-black"
                                    : "bg-pink text-white"
                                }`}
                              >
                                {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Activity badge — rotating "Just booked · {location} · {ago}"
                from the last 24h of real bookings. Heritage line is the
                fallback when the feed is quiet (or the endpoint failed).
                Only on chromed state — would clash with the transparent
                hero look. */}
            {chromed && (
              <span className="hidden items-center gap-1.5 rounded-[4px] bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 lg:inline-flex">
                {recentBookings.length > 0 ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
                    </span>
                    <span key={activityIdx} className="duration-300 animate-in fade-in slide-in-from-right-2">
                      Just booked · {recentBookings[activityIdx]?.location} ·{" "}
                      {(() => {
                        const m = recentBookings[activityIdx]?.agoMin ?? 0;
                        return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
                      })()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold uppercase tracking-[0.15em] text-pink">
                      Coliving
                    </span>
                    <span className="text-white/40">·</span>
                    <span>since 2019</span>
                  </>
                )}
              </span>
            )}

            {/* CTA — pink, with arrow translate on hover */}
            {locationName ? (
              <button
                onClick={() =>
                  document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })
                }
                className="group inline-flex items-center gap-1.5 rounded-[4px] bg-pink px-5 py-2 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_4px_24px_rgba(252,176,192,0.4)]"
              >
                {ctaLabel}
                <ArrowRight
                  size={13}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </button>
            ) : (
              <Link
                href="/move-in"
                className="group inline-flex items-center gap-1.5 rounded-[4px] bg-pink px-5 py-2 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_4px_24px_rgba(252,176,192,0.4)]"
              >
                {ctaLabel}
                <ArrowRight
                  size={13}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile bar — pill morph matching desktop. Wrapper is fixed
            h-14 so the drawer's top-14 anchor stays aligned. Inside, an
            h-10 inner pill picks up dark-glass chrome when chromed,
            stays transparent over the hero. CTA appears once chromed
            so the hero stays minimal but every scrolled view has a
            one-tap booking action. */}
        <div className="flex h-14 items-center px-3 lg:hidden">
          <div
            className={clsx(
              "flex h-10 w-full items-center justify-between rounded-[5px] px-3 transition-all duration-500 ease-out",
              chromed
                ? "bg-black/60 shadow-[0_4px_24px_rgba(0,0,0,0.25)] ring-1 ring-white/10 backdrop-blur-xl"
                : "bg-transparent shadow-none ring-0",
            )}
          >
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  setMobileOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="relative h-7 w-24 transition-transform duration-300 hover:scale-[1.03]"
            >
              <Image
                src="/images/stacey-logo-new-white-001.webp"
                alt="STACEY"
                fill
                className="object-contain object-left"
                sizes="100px"
                priority
              />
            </Link>
            <div className="flex items-center gap-2">
              {chromed && !mobileOpen && (
                <Link
                  href="/move-in"
                  className="rounded-[4px] bg-pink px-3 py-1 text-[11px] font-bold text-black transition-transform hover:scale-[1.04]"
                >
                  Move in
                </Link>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="relative h-6 w-6"
                aria-label="Toggle menu"
              >
                <span
                  className={clsx(
                    "absolute left-0 block h-0.5 w-6 bg-white transition-all duration-300",
                    mobileOpen ? "top-[11px] rotate-45" : "top-1",
                  )}
                />
                <span
                  className={clsx(
                    "absolute left-0 top-[11px] block h-0.5 w-6 bg-white transition-all duration-300",
                    mobileOpen ? "opacity-0" : "opacity-100",
                  )}
                />
                <span
                  className={clsx(
                    "absolute left-0 block h-0.5 w-6 bg-white transition-all duration-300",
                    mobileOpen ? "top-[11px] -rotate-45" : "top-[21px]",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — slides in from the right, anchored just below
          the slim mobile bar (h-14 = 56px). Dark-glass body matches the
          desktop mega menu so the brand stays consistent across
          breakpoints. */}
      <div
        className={clsx(
          "fixed inset-0 top-14 z-40 bg-black/95 backdrop-blur-xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-md px-5 pb-28 pt-6">
            {navCities.map((city) => (
              <div key={city.slug} className="mb-7">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {city.name} · {city.locs.length}{" "}
                  {city.locs.length === 1 ? "location" : "locations"}
                </p>
                <div className="space-y-1.5">
                  {city.locs.map((loc) => {
                    const price = (() => {
                      if (loc.stayType === "SHORT" && basePrices[loc.slug]) {
                        const prices = Object.values(basePrices[loc.slug]);
                        if (prices.length > 0) return Math.min(...prices);
                      }
                      return loc.priceFrom;
                    })();
                    const isActive = pathname === `/locations/${loc.slug}`;
                    return (
                      <Link
                        key={loc.slug}
                        href={`/locations/${loc.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className={clsx(
                          "flex items-center gap-3 rounded-[5px] bg-white/5 p-2.5 ring-1 transition-all active:bg-white/10",
                          isActive ? "ring-pink/60" : "ring-white/10",
                        )}
                      >
                        <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-[3px]">
                          <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="64px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {loc.name}
                          </p>
                          <p className="truncate text-[11px] text-white/60">
                            from €{price}
                            {loc.stayType === "SHORT" ? "/night" : "/mo"}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            "flex-shrink-0 rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                            loc.stayType === "SHORT" ? "bg-white text-black" : "bg-pink text-white",
                          )}
                        >
                          {loc.stayType === "SHORT" ? "SHORT" : "LONG"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-2 border-t border-white/10 pt-5">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/why-stacey"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white ring-1 ring-white/10 active:bg-white/10"
                >
                  Why STACEY
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white ring-1 ring-white/10 active:bg-white/10"
                >
                  FAQ
                </Link>
                <Link
                  href="/partners"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white ring-1 ring-white/10 active:bg-white/10"
                >
                  For Partners
                </Link>
                <a
                  href="mailto:booking@stacey.de"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white ring-1 ring-white/10 active:bg-white/10"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer bottom-fixed CTA — pink to pop against the
          dark-glass drawer body. */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:hidden",
          drawerVisible && mobileOpen ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="mx-auto max-w-md">
          <Link
            href="/move-in"
            onClick={() => setMobileOpen(false)}
            className="block w-full rounded-[5px] bg-pink px-6 py-3.5 text-center text-sm font-bold text-black active:opacity-80"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </>
  );
}
