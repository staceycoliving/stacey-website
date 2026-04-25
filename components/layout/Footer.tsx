import Link from "next/link";
import { locations } from "@/lib/data";
import CookieSettingsLink from "@/components/legal/CookieSettingsLink";
import FooterLogo from "@/components/layout/FooterLogo";

const hamburg = locations.filter((l) => l.city === "hamburg");
const berlin = locations.filter((l) => l.city === "berlin");
const vallendar = locations.filter((l) => l.city === "vallendar");

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      {/* Claim + brand statement. Brand line replaces the standalone
          AboutSection on the homepage (cut for length) — the long-form
          team story now lives at /why-stacey. */}
      <div className="border-b border-white/5 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p
            className="text-lg font-extrabold uppercase tracking-[0.2em] sm:text-xl"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) var(--fill), #FCB0C0 var(--fill), #FCB0C0 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "claimFill 5s ease-in-out infinite",
            }}
          >OUR MEMBERS CALL US HOME.</p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pink">
              Hamburg, since 2019
            </span>
            <span className="ml-3 align-middle">
              Coliving for people who&rsquo;d rather{" "}
              <span className="italic font-light text-white">meet someone</span>{" "}
              than scroll someone.
            </span>{" "}
            <Link
              href="/why-stacey"
              className="whitespace-nowrap underline decoration-pink underline-offset-4 transition-colors hover:text-white"
            >
              The full story →
            </Link>
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          {/* Hamburg */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Hamburg</h3>
            <ul className="space-y-1.5">
              {hamburg.map((loc) => (
                <li key={loc.slug}>
                  <Link href={`/locations/${loc.slug}`} className="text-sm text-white/70 transition-colors hover:text-pink">{loc.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Berlin & Vallendar */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Berlin</h3>
            <ul className="space-y-1.5">
              {berlin.map((loc) => (
                <li key={loc.slug}>
                  <Link href={`/locations/${loc.slug}`} className="text-sm text-white/70 transition-colors hover:text-pink">{loc.name}</Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-4 mt-6 text-xs font-bold uppercase tracking-widest text-white/30">Vallendar</h3>
            <ul className="space-y-1.5">
              {vallendar.map((loc) => (
                <li key={loc.slug}>
                  <Link href={`/locations/${loc.slug}`} className="text-sm text-white/70 transition-colors hover:text-pink">{loc.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Company */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Company</h3>
            <ul className="space-y-2.5">
              <li><Link href="/faq" className="text-sm text-white/70 transition-colors hover:text-pink">FAQ</Link></li>
              <li><Link href="/partners" className="text-sm text-white/70 transition-colors hover:text-pink">For Partners</Link></li>
              <li><Link href="/terms-of-service" className="text-sm text-white/70 transition-colors hover:text-pink">Terms</Link></li>
              <li><Link href="/imprint" className="text-sm text-white/70 transition-colors hover:text-pink">Imprint</Link></li>
              <li><Link href="/privacy" className="text-sm text-white/70 transition-colors hover:text-pink">Privacy</Link></li>
              <li><CookieSettingsLink className="text-sm text-white/70 transition-colors hover:text-pink" /></li>
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">Contact</h3>
            <ul className="space-y-2.5">
              <li><a href="mailto:booking@stacey.de" className="text-sm text-white/70 transition-colors hover:text-pink">booking@stacey.de</a></li>
              <li><a href="tel:+4940696389600" className="text-sm text-white/70 transition-colors hover:text-pink">+49 40 696389600</a></li>
              <li className="flex gap-3 pt-2">
                <a href="https://www.instagram.com/stacey.coliving/" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-pink" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/stacey-coliving/" target="_blank" rel="noopener noreferrer" className="text-white/40 transition-colors hover:text-pink" aria-label="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex items-center gap-4">
            <FooterLogo />
          </div>
          <p className="text-[11px] text-white/30">&copy; {new Date().getFullYear()} STACEY Real Estate GmbH</p>
        </div>
      </div>
    </footer>
  );
}
