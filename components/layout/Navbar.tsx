"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { locations } from "@/lib/data";

const navCities = [
  { name: "Hamburg", slug: "hamburg", locs: [...locations.filter((l) => l.city === "hamburg" && l.stayType === "SHORT"), ...locations.filter((l) => l.city === "hamburg" && l.stayType === "LONG")] },
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
  // True while the mobile drawer is open OR animating out. The nav bar
  // reads this (not mobileOpen) so it stays solid white during the
  // 300ms close slide — otherwise the bar snaps to transparent
  // immediately while the drawer is still visible.
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [basePrices, setBasePrices] = useState<Record<string, Record<string, number>>>({});

  const isDark = !transparent || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch dynamic prices for SHORT stay locations
  useEffect(() => {
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) setBasePrices(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      setDrawerVisible(true);
      // Lock immediately when opening so background can't scroll.
      document.body.style.overflow = "hidden";
      return;
    }
    // Delay drawerVisible unset AND body overflow unlock by 300ms
    // (= transition duration) so the nav bar stays solid white during
    // the close slide.
    const t = setTimeout(() => {
      document.body.style.overflow = "";
      setDrawerVisible(false);
    }, 300);
    return () => clearTimeout(t);
  }, [mobileOpen]);

  const logoSrc = logoHover
    ? "/images/stacey-logo-new-pink-001.webp"
    : isDark || drawerVisible
      ? "/images/stacey-logo-new-black-001.webp"
      : "/images/stacey-logo-new-white-001.webp";

  const ctaLabel = locationName
    ? stayType === "SHORT" ? "Check in" : "Move in"
    : "Move in";

  return (
    <>
    <nav
      className={clsx(
        "fixed top-0 left-0 right-0 z-50",
        // Transition only box-shadow (for the scroll state). Background is
        // not transitioned because opening the mobile drawer needs an
        // instant swap to solid white — otherwise the 300ms fade creates
        // a half-transparent bar during the drawer slide-in.
        "transition-shadow duration-300",
        // When the mobile drawer is visible (including during its 300ms
        // close slide) force a solid white bar so it visually merges
        // with the drawer below (no translucent seam).
        drawerVisible
          ? "bg-white shadow-sm"
          : isDark
            ? "bg-white/80 shadow-sm backdrop-blur-lg"
            : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={clsx(
            "relative flex items-center justify-between transition-all duration-300",
            scrolled ? "h-16 md:h-18" : "h-14 md:h-16"
          )}
        >
          {/* Logo — on home page: scroll to top; elsewhere: navigate home */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                setMobileOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={clsx(
              "relative transition-all duration-300 hover:scale-[1.03] hover:opacity-90",
              scrolled ? "h-12 w-36 sm:h-14 sm:w-44" : "h-10 w-32 sm:h-12 sm:w-36"
            )}
            onMouseEnter={() => setLogoHover(true)}
            onMouseLeave={() => setLogoHover(false)}
          >
            <Image
              src={logoSrc}
              alt="STACEY"
              fill
              className="object-contain"
              priority
            />
          </Link>

          {/* Desktop nav — centered with mega menus */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-1">
              {navCities.map((city) => (
                <div
                  key={city.slug}
                  className="relative"
                  onMouseEnter={() => setMegaOpen(city.slug)}
                  onMouseLeave={() => setMegaOpen(null)}
                >
                  <button
                    className={clsx(
                      "flex items-center gap-1 rounded-[5px] px-3 py-2 text-sm font-medium transition-all duration-200",
                      isDark ? "text-black hover:bg-[#FAFAFA]" : "text-white/90 hover:bg-white/10"
                    )}
                  >
                    {city.name}
                    <ChevronDown
                      size={12}
                      className={clsx("transition-transform duration-200", megaOpen === city.slug && "rotate-180")}
                    />
                  </button>

                  {/* Mega dropdown — pt-2 creates invisible hover bridge */}
                  {megaOpen === city.slug && (
                    <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2" style={{ width: "360px" }}>
                    <div className="rounded-[5px] bg-white p-4 shadow-xl ring-1 ring-[#E5E5E5]">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray">
                        {city.name} · {city.locs.length} {city.locs.length === 1 ? "location" : "locations"}
                      </p>
                      <div className="space-y-1">
                        {city.locs.map((loc) => (
                          <Link
                            key={loc.slug}
                            href={`/locations/${loc.slug}`}
                            className="flex items-center gap-3 rounded-[5px] p-2 transition-all hover:bg-[#F0F0F0] hover:pl-3"
                          >
                            <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-[3px]">
                              <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="56px" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold">{loc.name}</p>
                              <p className="text-[11px] text-gray">from €{(() => {
                                if (loc.stayType === "SHORT" && basePrices[loc.slug]) {
                                  const prices = Object.values(basePrices[loc.slug]);
                                  if (prices.length > 0) return Math.min(...prices);
                                }
                                return loc.priceFrom;
                              })()}{loc.stayType === "SHORT" ? "/night" : "/mo"}</p>
                            </div>
                            <span className={`rounded-[5px] px-2 py-0.5 text-[9px] font-bold ${
                              loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white"
                            }`}>
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
          </div>

          {/* CTA — contextual */}
          <div className="hidden lg:block">
            {locationName ? (
              <button
                onClick={() => document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" })}
                className={clsx(
                  "rounded-[5px] px-6 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-80",
                  isDark ? "bg-black text-white hover:opacity-80" : "border-2 border-white text-white hover:bg-white hover:text-black"
                )}
              >
                {ctaLabel}
              </button>
            ) : (
              <Link
                href="/move-in"
                className={clsx(
                  "rounded-[5px] px-6 py-2.5 text-sm font-semibold transition-all duration-200",
                  isDark ? "bg-black text-white hover:opacity-80" : "border-2 border-white text-white hover:bg-white hover:text-black"
                )}
              >
                {ctaLabel}
              </Link>
            )}
          </div>

          {/* Mobile — animated hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative h-6 w-6 lg:hidden"
            aria-label="Toggle menu"
          >
            <span
              className={clsx(
                "absolute left-0 block h-0.5 w-6 transition-all duration-300",
                isDark || drawerVisible ? "bg-black" : "bg-white",
                mobileOpen ? "top-[11px] rotate-45" : "top-1"
              )}
            />
            <span
              className={clsx(
                "absolute left-0 top-[11px] block h-0.5 w-6 transition-all duration-300",
                isDark || drawerVisible ? "bg-black" : "bg-white",
                mobileOpen ? "opacity-0" : "opacity-100"
              )}
            />
            <span
              className={clsx(
                "absolute left-0 block h-0.5 w-6 transition-all duration-300",
                isDark || drawerVisible ? "bg-black" : "bg-white",
                mobileOpen ? "top-[11px] -rotate-45" : "top-[21px]"
              )}
            />
          </button>
        </div>
      </div>
    </nav>

      {/* Mobile drawer + CTA live OUTSIDE the <nav> element. The nav has
          `backdrop-blur-lg` when scrolled, which creates a CSS containing
          block (per spec: any ancestor with backdrop-filter traps
          position:fixed children). Keeping them inside the nav caused
          the fixed bottom-0 CTA to render at the bottom of the NAV
          (= under the STACEY logo at the top of the page) while
          scrolled. Placing them as siblings of the nav keeps them
          anchored to the viewport. */}
      <div
        className={clsx(
          "fixed inset-0 top-14 z-40 bg-white transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-md px-5 pb-28 pt-6">
            {navCities.map((city) => (
              <div key={city.slug} className="mb-7">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray">
                  {city.name} · {city.locs.length} {city.locs.length === 1 ? "location" : "locations"}
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
                    return (
                      <Link
                        key={loc.slug}
                        href={`/locations/${loc.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-[5px] bg-[#FAFAFA] p-2.5 active:bg-[#F0F0F0]"
                      >
                        <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-[3px]">
                          <Image src={loc.images[0]} alt={loc.name} fill className="object-cover" sizes="64px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-black">{loc.name}</p>
                          <p className="truncate text-[11px] text-gray">
                            from €{price}
                            {loc.stayType === "SHORT" ? "/night" : "/mo"}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            "flex-shrink-0 rounded-[5px] px-2 py-0.5 text-[9px] font-bold",
                            loc.stayType === "SHORT" ? "bg-black text-white" : "bg-pink text-white"
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

            {/* Secondary nav */}
            <div className="mt-2 border-t border-lightgray pt-5">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/why-stacey"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-[#FAFAFA] px-4 py-2.5 text-center text-sm font-medium text-black active:bg-[#F0F0F0]"
                >
                  Why STACEY
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-[#FAFAFA] px-4 py-2.5 text-center text-sm font-medium text-black active:bg-[#F0F0F0]"
                >
                  FAQ
                </Link>
                <Link
                  href="/partners"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-[#FAFAFA] px-4 py-2.5 text-center text-sm font-medium text-black active:bg-[#F0F0F0]"
                >
                  For Partners
                </Link>
                <a
                  href="mailto:booking@stacey.de"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[5px] bg-[#FAFAFA] px-4 py-2.5 text-center text-sm font-medium text-black active:bg-[#F0F0F0]"
                >
                  Contact
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Move-in CTA — rendered OUTSIDE the drawer as a separate fixed
          element so the drawer's horizontal slide and the CTA's vertical
          slide animate independently. Fixes the iOS Safari bug where a
          bottom-anchored child jumps during a parent's translate-x
          (happened whether the child used absolute, flex-shrink-0, or
          sticky). Uses the same 300ms duration so they appear in sync. */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 border-t border-lightgray bg-white p-4 transition-transform duration-300 lg:hidden",
          drawerVisible && mobileOpen ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="mx-auto max-w-md">
          <Link
            href="/move-in"
            onClick={() => setMobileOpen(false)}
            className="block w-full rounded-[5px] bg-black px-6 py-3.5 text-center text-sm font-semibold text-white active:opacity-80"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </>
  );
}
