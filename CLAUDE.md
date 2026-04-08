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
  page.tsx               → Homepage (Hero-Booking-Flow + Sektionen)
  template.tsx            → Page transition wrapper
  locations/[slug]/       → Location-Detailseiten (dynamisch, client-side)
  preview/                → Design-Preview Seite (Varianten testen)
  hamburg/, berlin/, vallendar/ → Alte Routen (TODO: redirect)
  faq/, why-stacey/       → Unterseiten (TODO: neu bauen)
  move-in/                → Platzhalter (Buchungssystem kommt)
components/
  layout/Navbar.tsx       → Mega Menu, Frosted Glass, Contextual CTA, Animated Hamburger
  layout/Footer.tsx       → Footer (TODO: aktualisieren)
  ui/DualCalendar.tsx     → Shared Kalender-Component (Homepage + Location-Seiten)
  ui/LocationCard.tsx     → Location-Karte mit large-Prop
  ui/RoomCard.tsx         → Zimmer-Karte (alt, wird auf Location-Seite nicht mehr genutzt)
  ui/Badge.tsx            → SHORT/LONG Badges
lib/data.ts               → Alle Daten, Types, Helper-Funktionen
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
- LONG: Move-in Datum Dropdown mit verfügbaren Daten (1./15. jeden Monats)
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

- forCouples: NUR Jumbo, Jumbo Balcony, Studio
- SHORT Stay: Alster, Downtown (Othmarschen unklar)
- LONG Stay: alle anderen
- Min Stay SHORT: 5 Nächte
- Min Stay LONG: 3 Monate
- Cancellation LONG: 3 months notice
- Check-in: from 4 PM, Check-out: until 11 AM
