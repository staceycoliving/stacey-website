# STACEY Coliving — Go-Live Plan

**Ziel:** Website + Admin-Panel production-ready für `stacey.de`.
**Stand (19.04.2026):** Admin-Backend feature-complete, Konsistenz-Pass
abgeschlossen (Commit `d839935`). CI grün, Live-Test-Domain funktioniert.

Der Plan ist in **7 Sessions** aufgeteilt — jede in sich abgeschlossen,
in einem Arbeitstag durchführbar, mit klaren Deliverables.

---

## 📋 Session-Übersicht

| # | Fokus | Dauer | Blocker |
|---|-------|-------|---------|
| 1 | Legal Foundation (Impressum, Datenschutz, Cookie-Banner) | 1 Tag | Texte von Matteo |
| 2 | Content (FAQ, Why Stacey, Locations, Matterport) | 1 Tag | Texte + Bilder |
| 3 | Mobile Optimization (Homepage, Locations, /move-in) | 1-2 Tage | — |
| 4 | SEO + Performance (Meta, OG, Lighthouse) | 1 Tag | — |
| 5 | Admin Rest (Rooms Phase 2+3, Occupancy, Pricing, New-Booking) | 2 Tage | — |
| 6 | Admin Infrastructure (User/Team, Notifications, Cron-Health) | 2 Tage | — |
| 7 | Integration-Tests + Production-Cutover | 1 Tag | Alle Env-Vars |

---

## 🟥 SESSION 1 — Legal Foundation (NÄCHSTE SESSION)

### Ziel
Drei Seiten live, GDPR-Compliance-Grundlage steht.

### Vorarbeit für Matteo VOR der Session

Diese Inputs müssen bereit liegen — ohne sie können wir nicht starten:

1. **Impressum-Text** — Minimum nach §5 TMG:
   - Firmenname + Rechtsform
   - Ladungsfähige Anschrift
   - Vertretungsberechtigter (Geschäftsführer)
   - Kontakt: Telefon, E-Mail
   - Handelsregister + Nummer
   - USt-IdNr. (falls vorhanden)
   - Aufsichtsbehörde (falls zutreffend)
   - **Option:** fertigen Text von z.B. eRecht24 / IT-Recht Kanzlei besorgen

2. **Datenschutzerklärung-Text** — bei GDPR am sichersten über Generator:
   - eRecht24, Datenschutz-Generator, iubenda
   - Muss konkret alle eingesetzten Tools nennen: Vercel-Hosting,
     Supabase (DB), Resend (Email), Stripe (Payment), Yousign (Signatur),
     apaleo (PMS), Mapbox (Karten), Sentry (Monitoring),
     Google Fonts (über next/font lokal geladen — bewusst)
   - **Wichtig:** wir nutzen KEIN Google Analytics / GTM

3. **Cookie-Banner-Entscheidung** — eine der drei Optionen:
   - (A) **Custom-Banner** (minimal, DIY): wir bauen einen einfachen
     2-Stufen-Banner selbst (Accept All / Essential Only). Reicht wenn
     wir NICHT Analytics/Marketing-Tracking einsetzen.
     → Günstigste Option, unser aktueller Stack braucht nichts mehr.
   - (B) **Klaro** (open-source, self-hosted): mehr Control, kostenlos
   - (C) **Cookiebot / CookieYes** (kommerziell): ~10€/Monat, macht
     auch Compliance-Scans

   **Meine Empfehlung:** (A) Custom-Banner. Unser Stack ist schlank
   (keine Marketing-Scripts). Wenn später Analytics dazukommt, umbauen.

4. **Optional: AGB + Widerrufsbelehrung**
   - Entscheidung: abgedeckt im Mietvertrag (Yousign) oder separate
     Seite nötig? Für Online-Buchungen mit Widerrufsrecht sicherer mit
     Seite. Matteo entscheidet.

### Execution (meine Arbeit in der Session)

#### Step 1 — Routes anlegen
- `app/impressum/page.tsx` — Server Component, nutzt Global Layout,
  Content aus `lib/legal-content.ts` (zentrale Stelle, Matteo kann
  nachträglich editieren ohne Code)
- `app/datenschutz/page.tsx` — analog
- `app/agb/page.tsx` — optional
- `app/widerruf/page.tsx` — optional

#### Step 2 — Cookie-Banner
- `components/legal/CookieBanner.tsx` — Client Component
- State: `localStorage["cookie-consent"]` = `"accepted" | "essential" | null`
- Banner erscheint nur wenn State `null`
- Zwei Buttons: "Alle akzeptieren" + "Nur essentielle"
- Footer-Link "Cookie-Einstellungen ändern" setzt State auf `null` → Banner
  kommt zurück
- Aktuell KEIN Script-Loading nach Consent (weil keine nicht-essentiellen
  Scripts da) — aber Hook bereitstellen: `useCookieConsent()` exportieren
  damit zukünftige Integrations einen Platz haben

#### Step 3 — Footer überprüfen
- Links auf `/impressum` + `/datenschutz` existieren schon
- Neue Links ergänzen: `/agb`, `/widerruf`, "Cookie-Einstellungen"
- Footer-Copyright-Jahr dynamisch

#### Step 4 — Meta-Noindex auf Legal-Pages prüfen
- Impressum + Datenschutz sollen indexierbar sein (Ja)
- Keine speziellen Meta-Tags nötig außer Title

#### Step 5 — Tests
- `npx tsc --noEmit` + `npx eslint . --max-warnings 0` grün
- localhost: alle 4 URLs (200), Banner bei leerem LocalStorage erscheint
- Commit + Push → Vercel-Deploy verifizieren

### Session 1 Deliverables
- [ ] `/impressum` live mit 200
- [ ] `/datenschutz` live mit 200
- [ ] Cookie-Banner zeigt bei erstem Besuch
- [ ] Footer-Links funktionieren (keine 404er)
- [ ] Commit auf main + CI grün

### Session 1 Zeitbudget
**3-5 Stunden** (je nach Texte-Länge und Cookie-Banner-Option)

---

## 🟧 SESSION 2 — Content Polish

**Vorarbeit von Matteo:**
- FAQ-Fragen + Antworten (Liste)
- Why-Stacey-Copy (Story, Values, USPs)
- Location-Beschreibungen für: Eimsbüttel, St. Pauli, Eppendorf, Mitte,
  Vallendar, Alster, Downtown (Mühlenkamp ist schon fertig)
- Matterport-Tour-URLs für alle Locations
- Room-Fotos in `public/images/locations/<slug>/<room>/` als WebP

**Session-Arbeit:**
- FAQ-Seite befüllen (`app/faq/page.tsx`)
- Why-Stacey-Seite finalisieren (`app/why-stacey/page.tsx`)
- `lib/data.ts` — alle Location-`description`-Felder befüllen
- Matterport-URLs aus hardcoded (aktuell nur Mühlenkamp) in `lib/data.ts`
  pro Location
- Room `images[]` Arrays pro Location befüllen
- Partners-Seite (neu) anlegen falls gewünscht

---

## 🟨 SESSION 3 — Mobile Optimization

**Vorarbeit:** keine, nur Testing-Zeit.

**Session-Arbeit — komplette Mobile-Tour:**
- Homepage Hero Booking Flow (DualCalendar-Modal, Sticky CTA)
- Navbar Mobile (Mega-Menu → Full-Screen-Drawer)
- Location-Seiten (Sticky Booking Card → Bottom Sheet)
- `/move-in` Step-by-Step auf Mobile
- Admin Panel Basic-Mobile (Lesbarkeit priorisieren über Feature-Parität)

**Approach:** Chrome DevTools Device-Emulator + echtes Device für
Smoke-Test. Breakpoints `sm` (640), `md` (768), `lg` (1024) systematisch
durchgehen.

---

## 🟩 SESSION 4 — SEO + Performance

**Session-Arbeit:**
- Open Graph + Twitter Cards pro Seite
- JSON-LD Structured Data (`LocalBusiness`, `Accommodation`)
- Sitemap-Eintrag-Check (`app/sitemap.ts`)
- `robots.ts` final konfigurieren
- `<img>` → `<Image />` für alle LCP-relevanten Bilder
- Lighthouse-Audit → Score ≥ 90 auf allen 4 Kategorien
- Favicon-Set (touch-icon, maskable, 192/512)

---

## 🟦 SESSION 5 — Admin Rest

**Session-Arbeit:**
- Rooms Phase 2+3 (Bulk-Actions, Historical Occupancy)
- Occupancy-Page Content-Review (was zeigt sie wirklich? aktuell
  Placeholder-Charts)
- Pricing-Page Content-Review (aktuell Heatmap — Validierung gegen echte
  Daten)
- Admin "+ New Booking"-Flow (Live-Availability-Dropdown, erstellt PENDING
  Booking, Tenant bekommt Link auf `/move-in?booking=<id>`)
- `Tabs` + `Modal` Primitives in bestehende Pages retrofit

---

## ⬛ SESSION 6 — Admin Infrastructure

**Session-Arbeit:**
- User/Team-Modell — Prisma-Schema-Migration für User-Table,
  Rollen (OWNER, ADMIN, VIEWER), Login-Flow
- Notification-System — In-App Badge + Email-Digest für neue Bookings,
  failed payments
- Cron-Health-Dashboard — Tabelle mit letzter Run-Zeit, Fehler-Count,
  Manual-Trigger-Button pro Cron
- Report-Generation — monatliches PDF (Finance + Occupancy Summary)
  per Cron, Email an Matteo

---

## 🟪 SESSION 7 — Integration Tests + Cutover

**Vorarbeit:** ALLE Legal + Content + Mobile + SEO + Admin done.

**Production-Credentials Setup in Vercel:**
- Stripe Live-Keys + neuer Webhook-Secret
- Yousign Production-Key
- `TEST_MODE_EMAILS` löschen
- `ENABLE_SHORT_STAY_EMAILS=true`
- `NEXT_PUBLIC_BASE_URL=https://stacey.de`
- Google Drive Service-Account Credentials
- apaleo Production Webhook umziehen

**Structured End-to-End Tests (alle gegen Production-Keys in einem
Pre-Live-Staging-Window):**
- [ ] SHORT-Booking End-to-End (apaleo-Reservation + Email)
- [ ] LONG-Booking End-to-End (Yousign-Vertrag + Stripe Booking-Fee)
- [ ] Deposit-Flow (2× Miete in 24h, Timeout-Handling)
- [ ] Rent-Cycle (erster Monat, Mahnung, Zahlung)
- [ ] Move-Out + Deposit-Return (6 Wochen später via Cron-Manual-Trigger)
- [ ] Kündigungs-Flow (3-Monats-Frist)
- [ ] Alle 15 Email-Templates (Dry-Run mit echten Empfängern)
- [ ] Admin-Refund (Stripe)
- [ ] Webhook-Simulation (Stripe Test-Events, apaleo Reservation-Events)

**Cutover:**
- DNS-Switch auf stacey.de (oder Vercel Domain-Alias)
- Post-Cutover-Smoke-Test
- Rollback-Plan dokumentieren

---

## 📌 Cross-Session Work (parallel zu allem möglich)

Diese Tasks blockieren niemanden und können jederzeit dazwischen:

- [ ] **Kiwi/Salto** — sobald Credentials da sind, in eigener Session
  integrieren (1 Tag). Alster=Kiwi, Downtown=gemischt.
- [ ] **Lint-Warnings aufräumen** — aktuell 81 Warnings (kein Error),
  vor Live auf 0. 1-2h Arbeit.
- [ ] **Sentry-Alerting** konfigurieren (Slack-Integration bei Errors)
- [ ] **Staging-Environment** aufsetzen (eigene Supabase + Branch-Vercel)

---

## 🎯 Kritischer Pfad

Wenn du NUR das Minimum für Go-Live machen willst:

**Pflicht: Session 1 → 4 → 7.**
(Legal + SEO-Basics + Cutover. Content, Mobile, Admin-Rest sind Polish.)

**Empfohlen: 1 → 2 → 3 → 4 → 7.**
(Ohne Mobile ist ~60% des Traffics schlecht bedient.)

**Vollständig: 1 → 2 → 3 → 4 → 5 → 6 → 7.**

---

## 🤝 Wie wir zusammen arbeiten

Für jede Session:
1. Matteo bringt die Vorarbeit-Inputs mit (steht pro Session oben).
2. Ich arbeite lokal, häng Chrome auf localhost, Matteo smoke-testet.
3. Commit auf main → Vercel-Deploy → Live-Test-Domain-Check (~60s).
4. Keine Seite geht live ohne "passt" von Matteo.

**Hard Rules (aus CLAUDE.md):**
- Localhost first, immer.
- Schema-Migrations nur direkt auf main (nie in Feature-Branches).
- Keine destruktiven Operationen ohne explizite Zustimmung.
- Kein TEST_MODE abschalten außer im Cutover (Session 7).
