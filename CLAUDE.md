@AGENTS.md

# STACEY Coliving Website

Neuaufbau von stacey.de — modernes Coliving-Website mit Next.js.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4 (CSS-basierte Config via `@theme inline`, KEIN tailwind.config.ts)
- **Animations:** Framer Motion (nur Hero)
- **Icons:** lucide-react
- **Font:** Montserrat (einzige Schriftart, alle Gewichte 300-900) via `next/font/google`

## Projektstruktur

```
app/
  page.tsx                → Homepage (Hero-Booking-Flow + Sektionen)
  template.tsx            → Page transition wrapper
  locations/[slug]/       → Location-Detailseiten (dynamisch, client-side)
  move-in/                → Buchungs-Flow (SHORT + LONG end-to-end)
  faq/, why-stacey/       → Unterseiten (Inhalt = Platzhalter, verlinkt aus Footer/Hero)
  admin/                  → Admin-Dashboard (Bookings, Tenants, Rooms, Rent, Deposits)
  api/                    → Route handlers
    availability/         → Verfügbarkeit (LONG aus DB, SHORT via apaleo)
    booking/              → Buchungs-Erstellung
    checkout/, checkout/short/ → Stripe checkout sessions (LONG booking fee, SHORT full payment)
    lease/                → Yousign Vertrags-Erstellung + Status
    webhooks/stripe/      → Stripe Event-Handler
    cron/daily/, cron/monthly-rent/ → Vercel Cron jobs
    admin/                → Admin-only routes
components/
  layout/Navbar.tsx       → Mega Menu, Frosted Glass, Contextual CTA, Animated Hamburger
  layout/Footer.tsx       → Footer
  move-in/StepAboutYou.tsx, StepLease.tsx → Step-Components für /move-in
  ui/DualCalendar.tsx     → Shared Kalender (Homepage + Location-Seiten + /move-in)
  ui/LocationCard.tsx     → Location-Karte
  ui/LocationMap.tsx      → Mapbox Karte (dynamic import, kein SSR)
  ui/Badge.tsx            → SHORT/LONG Badges
  ui/FadeIn.tsx           → Fade-In Wrapper
lib/
  data.ts                 → Locations, features, faq, helpers, types (Frontend-Daten)
  availability.ts         → Shared availability/filter helpers (14-day window, persons filter)
  apaleo.ts               → apaleo API-Wrapper (SHORT stay)
  db.ts                   → Prisma client (uses DIRECT_URL)
  email.ts                → Resend templates + TEST_MODE wrapper
  stripe.ts               → Stripe client config
  yousign.ts              → Yousign API-Wrapper
  admin-auth.ts           → Cookie-based admin auth
  test-mode.ts            → TEST_MODE_EMAILS whitelist
```

## Kommandos

- `npm run dev` — Dev-Server starten
- `npx next build` — Production Build

## Design System

- **Pink:** `#FCB0C0` (Akzent, NIE text-white auf white bg)
- **Schwarz:** `#1A1A1A` (Text, primäre CTAs)
- **Weiß:** `#FFFFFF` / **Grau-alt:** `#FAFAFA` (abwechselnde Sektionen)
- **Border-Radius:** `rounded-[5px]` überall (keine `rounded-full` außer Avatare)
- **Italic-Pattern:** Headlines mit einem italic Schlüsselwort
- **Claim:** "OUR MEMBERS CALL US HOME." (all caps)
- **Sprache:** Englisch (komplett)
- **Texte:** "Starting from" nicht "All-inclusive from", "Almost everything included" nicht "Everything included"

## Navbar

- `transparent` Prop: Homepage = transparent über Hero, andere = sofort dark
- `locationName` Prop: zeigt "Book [Name]" statt "Book now", scrollt zu #rooms
- Mega Menu mit Location-Previews (Foto, Preis, Badge) bei Hover
- Frosted Glass (bg-white/80 backdrop-blur-lg) nach Scroll
- Slim→Full Animation, Animated Hamburger (CSS)

## Location-Seite Template

- SHORT/LONG wird automatisch erkannt via `location.stayType`
- SHORT: DualCalendar als Modal (z-[9999]) für Check-in/Check-out, min 5 Nächte
- LONG: Move-in Datum Dropdown mit verfügbaren Daten (flexibler Einzugstag)
- Personen-Toggle (1/2) filtert Rooms (nur Jumbo/Jumbo Balcony/Studio für 2 Personen)
- Sticky Booking Card rechts (Desktop), normaler Block (Mobile)
- Room `images` Array für Kategorie-Lightbox (aktuell nur Mühlenkamp befüllt)
- Matterport 3D-Tour eingebettet (aktuell hardcoded URL für Mühlenkamp)
- Google Maps Embed mit Location-Adresse

## Bilder & Videos

- Alle lokal in `public/images/` als WebP
- Hero: `website-hero.webp`
- Video: `life-at-stacey.mp4` + `video-thumbnail.webp`
- Interviews: `interview-{1,2,3}.mp4` + Thumbs
- Community Manager: `community-manager.webp`
- Team: `stacey-team.webp`
- Press: `press/*.svg`
- Locations: `locations/{slug}/{room-type}/*.webp`
- Pfad-Helper: `loc(location, folder, file)` in data.ts

## Booking Rules

- forCouples: NUR Jumbo, Jumbo Balcony, Studio, Premium+ Balcony
- SHORT Stay: Alster, Downtown (über apaleo, NICHT in der DB)
- LONG Stay: Mühlenkamp, Eimsbüttel, St. Pauli, Eppendorf, Mitte (Berlin), Vallendar (über eigene DB)
- Min Stay SHORT: 5 Nächte
- Min Stay LONG: 3 Monate
- Cancellation LONG: 3 months notice
- Check-in: from 4 PM, Check-out: until 11 AM

## LONG Stay 14-Tage Flexibility Rule

Pro Kategorie liefert die API earliest moveInDates (Auszugstag+1 jedes frei werdenden Zimmers). Filter-Logik:
- **earliest ≤ today+14** → flexibel: jeder Tag von earliest bis today+14 ist buchbar
- **earliest > today+14** → fest: NUR das exakte earliest-Datum buchbar (NICHT spätere Tage)

Diese Logik lebt in `lib/availability.ts` und wird von Homepage, Location-Seite und /move-in geteilt. NIE einfach `>=` als Filter nutzen — das verletzt die Regel.
