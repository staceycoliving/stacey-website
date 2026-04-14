# STACEY Admin Dashboard — Build Prompt für Claude Code

## WICHTIGE VORAB-REGEL

**Wenn irgendetwas in diesem Prompt der bestehenden Logik im Repository widerspricht, FRAG MICH ZUERST bevor du es änderst.** Es kann sein, dass ich Kleinigkeiten überlesen habe. Im Zweifel gilt der bestehende Code als Source of Truth. Ändere NIEMALS bestehende Webhook-Handler, Cron-Jobs, Booking-Logik, Availability-Regeln oder E-Mail-Templates ohne explizite Freigabe.

---

## Kontext

Du arbeitest am Repository `stacey-website` (github.com/staceycoliving/stacey-website). Das ist die Website + Backend + Admin Dashboard für STACEY Coliving — einen Coliving-Betreiber mit 250+ Zimmern an 6+ Standorten in Hamburg, Berlin und Vallendar.

**Lies zuerst `CLAUDE.md` im Repo-Root** — dort stehen Tech Stack, Projektstruktur, Design System, Booking Rules und die 14-Tage-Flexibility-Rule. Alles dort Dokumentierte gilt weiterhin.

Das Admin Dashboard unter `/admin` wird vom Verwaltungstool zum Operations-Intelligence-System erweitert. Wir bauen phasenweise.

---

## Bestehende Architektur (NICHT ÄNDERN)

### Schema (prisma/schema.prisma)
- **Location** → **Apartment** → **Room** (kein Building-Layer, bewusste Entscheidung)
- **Tenant**: 1:1 an Room (roomId unique). Tenant IST de facto die Lease — kein separates Lease-Modell.
- **Booking**: Pipeline-Status als Enum (PENDING → SIGNED → PAID → DEPOSIT_PENDING → CONFIRMED → CANCELLED)
- **RentPayment**: Monatliche Soll/Ist-Tracking mit Mahnung-Stufen
- **RoomCategory**: Enum (BASIC_PLUS, MIGHTY, PREMIUM, PREMIUM_PLUS, PREMIUM_BALCONY, PREMIUM_PLUS_BALCONY, JUMBO, JUMBO_BALCONY, STUDIO, DUPLEX)
- **WebhookEvent**: Idempotency-Log

### Bestehende Automationen (FINGER WEG)
- `app/api/webhooks/stripe/route.ts` — Booking Fee → Deposit Link → Tenant erstellen → Payment Setup
- `app/api/cron/daily/route.ts` — Deposit Timeout (48h), Payment Setup Reminders (Tag 1/3/7/14), Welcome Mails (3 Tage vor Move-in), Rent Reminders + Mahnungen (Tag 3/14/30), Auto-Kündigung bei 2+ Monaten Rückstand
- `app/api/cron/monthly-rent/route.ts` — RentPayment erstellen, Pro-rata-Berechnung, SEPA-Einzug
- `lib/availability.ts` — 14-Tage-Flexibility-Rule
- `app/api/booking/route.ts` — Zimmerzuordnung, Verfügbarkeitsprüfung
- `lib/email/*` — Alle E-Mail-Templates

### Bestehende Admin-Seiten
- `app/admin/BookingsPage.tsx` — Pipeline-Tabelle
- `app/admin/tenants/TenantsPage.tsx` — Mieterübersicht
- `app/admin/rooms/RoomsPage.tsx` — Zimmer-Grid
- `app/admin/rent/RentPage.tsx` — Rent Soll/Ist
- `app/admin/deposits/DepositsPage.tsx` — Kautionsverwaltung
- `app/admin/AdminShell.tsx` — Navigation (NAV_ITEMS Array)

### Design System (BEIBEHALTEN)
- `rounded-[5px]` überall (KEIN rounded-full außer Avatare)
- Tailwind CSS v4 (CSS-basierte Config via `@theme inline`, KEIN tailwind.config.ts)
- Farben: Pink `#FCB0C0` (Akzent), Schwarz `#1A1A1A`, Weiß `#FFFFFF`, Grau-alt `#FAFAFA`
- Font: Montserrat
- Sprache im Admin: Englisch (wie bestehend)
- Bestehende UI-Patterns: `bg-white rounded-[5px] border border-lightgray` für Cards, `bg-background-alt` für Zebra-Rows, Status-Badges als `inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold`

### Code-Patterns (BEIBEHALTEN)
- Auth: `isAuthenticated()` aus `lib/admin-auth.ts` in jeder Admin-API-Route
- API-Responses: `Response.json(...)` direkt (admin routes) oder `apiOk/apiBadRequest` (public routes)
- Server Components für Page-Wrapper (data fetching), Client Components für interaktive Seiten (`"use client"`)
- Prisma: Import via `import { prisma } from "@/lib/db"`
- Stripe: Import via `import { stripe } from "@/lib/stripe"`
- Beträge: Immer in **Cent** (Int), Anzeige als `€${(cents / 100).toFixed(0)}` oder `.toFixed(2)`

---

## PHASE 1: Schema-Erweiterung + Mieter-Folio (Wochen 1–4)

### 1.1 Prisma Schema erweitern

Neue Felder an **bestehenden** Modellen (Migration erstellen):

```
// Room: Status hinzufügen
model Room {
  // ... bestehende Felder ...
  status    RoomStatus @default(ACTIVE)
}

enum RoomStatus {
  ACTIVE
  BLOCKED
  DEACTIVATED
}

// Booking: Stornierungsgrund
model Booking {
  // ... bestehende Felder ...
  cancellationReason String?
}

// Tenant: Zusätzliche Felder
model Tenant {
  // ... bestehende Felder ...
  nationality      String?
  emergencyContact String?
  idDocumentUrl    String?   // Google Drive Link
  
  extraCharges     ExtraCharge[]
  rentAdjustments  RentAdjustment[]
  defects          Defect[]
  notes            Note[]
}
```

Neue Modelle:

```
model ExtraCharge {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  description String
  amount      Int      // Cent
  createdBy   String?  // User-Name oder ID
  createdAt   DateTime @default(now())

  @@index([tenantId])
}

model RentAdjustment {
  id              String    @id @default(cuid())
  tenantId        String
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  month           DateTime? // Null = permanent
  originalAmount  Int       // Cent
  adjustedAmount  Int       // Cent
  reason          String
  isPermanent     Boolean   @default(false)
  validFrom       DateTime? // Nur bei isPermanent = true
  createdBy       String?
  createdAt       DateTime  @default(now())

  @@index([tenantId])
}

model Defect {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  description     String
  deductionAmount Int      // Cent
  photos          String[] // Google Drive Links
  createdBy       String?
  createdAt       DateTime @default(now())

  @@index([tenantId])
}

model Note {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  content   String
  createdBy String?
  createdAt DateTime @default(now())

  @@index([tenantId])
}
```

**ACHTUNG:** Wenn die Migration bestehende Daten betrifft (z.B. Room.status mit Default), stelle sicher dass sie non-breaking ist. Alle neuen Felder müssen optional sein oder Defaults haben.

### 1.2 Mieter-Folio (komplett neu)

Erstelle `app/admin/tenants/[id]/page.tsx` als Server Component und `app/admin/tenants/[id]/TenantFolioPage.tsx` als Client Component.

**Route:** `/admin/tenants/[id]`

**Data Fetching (Server Component):**
```typescript
// Tenant mit allen Relations laden
const tenant = await prisma.tenant.findUnique({
  where: { id },
  include: {
    room: { include: { apartment: { include: { location: true } } } },
    booking: true,
    rentPayments: { orderBy: { month: 'desc' } },
    extraCharges: { orderBy: { createdAt: 'desc' } },
    rentAdjustments: { orderBy: { createdAt: 'desc' } },
    defects: { orderBy: { createdAt: 'desc' } },
    notes: { orderBy: { createdAt: 'desc' } },
  },
});
```

**Folio-Layout:**

Header oben: Name, Zimmer (#roomNumber @ Location), Status-Badge, Mietdauer (seit moveIn), Zahlungsstatus-Badge. Zurück-Button zur Übersicht.

6 Tabs darunter (wie bei Hotel-PMS):

**Tab 1: Stammdaten** — Alle Tenant-Felder anzeigen und editierbar. Felder: firstName, lastName, email, phone, dateOfBirth, street, zipCode, addressCity, country, nationality, emergencyContact, idDocumentUrl. Save-Button.

**Tab 2: Wohnung & Vertrag** — Location, Adresse, Apartment, Zimmer, Kategorie, monthlyRent. Vertragsbeginn (moveIn), Vertragsende (moveOut oder "Open End"), Kündigungsdatum (notice), Kündigungsfrist (3 Monate). Mietvertrag-PDF Link (falls Booking.signatureDocumentId vorhanden). Widerrufsfrist-Status: Wenn bookingFeePaidAt + 14 Tage > heute → "Widerrufsfrist läuft (noch X Tage)" mit Widerrufs-Button.

**Tab 3: Zahlungen** — Monatliche Tabelle: Monat | Soll | Ist | Delta | Status. Daten aus RentPayment. Darunter: Kaution (depositAmount, depositStatus), Booking Fee (aus Booking.bookingFeePaidAt). ExtraCharges-Liste mit "Hinzufügen"-Button (Beschreibung + Betrag). Mietanpassung: Button "Miete anpassen" → Modal mit: Betrag, Grund, permanent (ja/nein), gültig ab. Bei permanent: Tenant.monthlyRent wird aktualisiert. Gesamtsaldo berechnet: Summe aller (amount - paidAmount) aus RentPayment + ExtraCharges.

**Tab 4: Mängel & Kautionsabrechnung** — Liste aller Defects mit "Mangel hinzufügen"-Button (Beschreibung, Betrag, Fotos). Kautionsberechnung: Kaution (depositAmount) - Mängel (SUM defects) - Offene Posten (SUM unpaid rent + extraCharges) = Auszahlung/Forderung. Preview des Breakdowns. Buttons: "Kautionsabrechnung senden" (Mail) + "Kaution auszahlen" (Stripe Refund oder manuell).

**Tab 5: Timeline** — Chronologische Liste aller Events: Zahlungen (RentPayment mit Status-Änderungen), Notizen (Notes), Status-Änderungen (aus Booking.status-Verlauf), E-Mail-Events (welcomeEmailSentAt, paymentSetupRemindersSent etc. — aus bestehenden Tenant-Feldern). Filterbar nach Typ. "Notiz hinzufügen"-Button.

**Tab 6: Dokumente** — Mietvertrag (Yousign PDF, Download-Link falls signatureDocumentId vorhanden), SEPA-Status (sepaMandateId vorhanden?), idDocumentUrl. Placeholder für Google Drive Integration (Phase 5).

### 1.3 Mieterübersicht erweitern

`app/admin/tenants/TenantsPage.tsx` erweitern:

**Zusätzliche Spalten:** Adresse (apartment.houseNumber), Stockwerk (apartment.floor), Apartment-Label (apartment.label), Kategorie (room.category formatiert), E-Mail, Zahlungsstatus (berechnet aus RentPayments).

**Spalten-Sortierung:** Jeder Spaltenheader klickbar → sortiert ASC/DESC. State: `sortColumn` + `sortDirection`.

**Klick auf Zeile:** `router.push(\`/admin/tenants/${t.id}\`)` → öffnet Folio.

**Aktions-Dropdown** (ersetzt die einzelnen Edit/Terminate/Remove Buttons):
- Dropdown-Button "Actions" pro Zeile mit Optionen:
  - "Open Folio" → navigiert zum Folio
  - "Send payment setup link" (bestehende Logik aus sendSetupLink)
  - "Set move-out date" → Inline-Date-Picker (bestehende Edit-Logik)
  - "Adjust rent" → kleines Modal
  - "Withdraw (Widerruf)" → nur sichtbar wenn innerhalb 14-Tage-Frist. Löst aus: Stripe Refund der Kaution (NICHT Booking Fee), Booking.status → CANCELLED mit cancellationReason "Widerruf", Tenant löschen, Room freigeben.
  - "Generate certificate" → Sub-Menü: Mietschuldenfreiheit / Wohnungsbestätigung (Phase 3, erstmal disabled)
  - "Remove tenant" (bestehende Delete-Logik mit Confirm)

**Wichtig für den Widerrufs-Workflow:** Die Booking Fee wird über Stripe Checkout bezahlt (bookingFeeSessionId). Die Kaution wird separat bezahlt (depositPaymentLinkId). Beim Widerruf wird NUR die Kaution refunded (über Booking.depositAmount), NICHT die Booking Fee. Prüfe den bestehenden Stripe-Flow bevor du den Refund implementierst.

### 1.4 Navigation erweitern

`app/admin/AdminShell.tsx`: NAV_ITEMS erweitern:
```typescript
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },       // NEU: Command Center (Phase 2, erstmal redirect auf Bookings)
  { href: "/admin/bookings", label: "Bookings" }, // Umbenannt von /admin
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/rent", label: "Rent" },
  { href: "/admin/deposits", label: "Deposits" },
];
```

**ACHTUNG:** Die bestehende Bookings-Page liegt aktuell auf `/admin` (page.tsx importiert BookingsPage). Verschiebe sie nach `/admin/bookings/page.tsx` und mache `/admin/page.tsx` zum neuen Dashboard (erstmal mit Redirect auf /admin/bookings bis Phase 2).

### 1.5 API-Routes für neue Features

Erstelle neue Admin-API-Routes nach bestehendem Pattern:

```
app/api/admin/tenants/[id]/route.ts        → GET (Folio-Daten), PATCH (Stammdaten updaten)
app/api/admin/tenants/[id]/extra-charges/route.ts → POST (ExtraCharge anlegen), DELETE
app/api/admin/tenants/[id]/rent-adjustment/route.ts → POST (Mietanpassung)
app/api/admin/tenants/[id]/defects/route.ts → POST (Mangel anlegen), DELETE
app/api/admin/tenants/[id]/notes/route.ts   → POST (Notiz anlegen)
app/api/admin/tenants/[id]/withdraw/route.ts → POST (Widerruf durchführen)
```

Jede Route: `isAuthenticated()` Check, Input-Validation, Prisma-Operation, Response.json.

---

## PHASE 2: Command Center + Pipeline-Upgrade (Wochen 5–8)

### 2.1 Command Center

Erstelle `app/admin/DashboardPage.tsx` als neue Startseite (`/admin/page.tsx`).

**KPI-Karten** (4 Cards oben, bestehendes Card-Pattern `bg-white rounded-[5px] border border-lightgray p-4`):
- Belegungsquote: `(rooms with tenant) / (total rooms where status = ACTIVE)` × 100%, pro Location
- Offene Zahlungen: `SUM(amount - paidAmount) WHERE status IN (PENDING, FAILED)`
- Kautionsbestand: `SUM(depositAmount) WHERE depositStatus = RECEIVED`
- Monatsumsatz: Aktueller Monat Soll vs. Ist aus RentPayment

**Vacancy-Tracking** (Sektion darunter):
- Durchschnittliche Turnaround Time: Berechnet aus Differenz zwischen Tenant.moveOut und nächstem Tenant.moveIn auf demselben Room
- Vacancy Cost: Leere Zimmer × deren monthlyRent / 30 × Tage leer
- Nachmieter-Status: Zimmer mit Tenant.moveOut in Zukunft → prüfen ob eine Booking mit status != CANCELLED auf demselben roomId existiert mit moveInDate nach dem moveOut

**Action Items** (automatisch generierte To-Do-Liste):
- Query: Bookings WHERE status = DEPOSIT_PENDING AND depositDeadline < now+24h
- Query: RentPayments WHERE status = FAILED
- Query: Tenants WHERE moveOut IS NOT NULL AND moveOut < now AND depositStatus = RECEIVED (Kautionsabrechnung ausstehend)
- Query: Tenants WHERE sepaMandateId IS NULL AND moveIn < now + 7 days
- Query: Rooms mit Tenant.moveOut < now + 90 days OHNE nachfolgende Booking

**Move-ins / Move-outs diese Woche:**
- Query: Tenants WHERE moveIn BETWEEN monday AND sunday+7
- Query: Tenants WHERE moveOut BETWEEN monday AND sunday+7

### 2.2 Pipeline Kanban-Ansicht

Erweitere `/admin/bookings` um einen Toggle: Tabelle (bestehend) | Kanban (neu).

Kanban: Eine Spalte pro BookingStatus. Karten zeigen: Name, Zimmer, Location, Tage seit letztem Status-Wechsel. Farbcodierung: Grün (im Plan), Gelb (Frist läuft), Rot (Frist überschritten). Drag & Drop ist nice-to-have aber nicht kritisch — Status-Buttons auf der Karte reichen.

### 2.3 Property-CRUD

Erweitere `/admin/rooms`:
- "Add Location" Button → Modal (name, slug, city, address, stayType)
- "Add Apartment" Button pro Location → Modal (houseNumber, floor, label)  
- "Add Room" Button pro Apartment → Modal (roomNumber, category, monthlyRent)
- Edit/Delete für alle Ebenen
- Room sperren/entsperren (status → BLOCKED/ACTIVE)

**Preisverwaltung:**
- Button "Batch price update" → Modal: Location-Dropdown + Category-Dropdown + neuer Preis → aktualisiert alle passenden Rooms
- Individual Override bleibt über Room-Edit möglich

API-Routes:
```
app/api/admin/locations/route.ts → CRUD
app/api/admin/apartments/route.ts → CRUD
app/api/admin/rooms/route.ts → CRUD + batch-price
```

---

## PHASE 3: Kautionsabrechnung + Belegungsplan + Bescheinigungen (Wochen 9–12)

### 3.1 Kautionsabrechnung erweitern

`app/admin/deposits/DepositsPage.tsx` erweitern:

- **Arbeitslisten-Filter:** Default-Ansicht zeigt nur Tenants mit moveOut < heute UND depositStatus = RECEIVED. Toggle für "Alle anzeigen".
- **Einzelne Mängel** statt pauschalem damagesAmount: Liste der Defects pro Tenant (aus neuem Defect-Modell). damagesAmount auf Tenant wird zur berechneten Summe aller Defects.
- **Automatische Mail-Logik:** Button "Send settlement" berechnet Saldo. Positiv → generiert Auszahlungsmail mit Breakdown. Negativ → generiert Forderungsmail. E-Mail-Templates analog zu bestehenden in lib/email/.
- **Tage seit Auszug:** Spalte mit Farbcodierung (>14 Gelb, >30 Rot).

### 3.2 Belegungsplan

Neue Seite: `app/admin/occupancy/page.tsx` + `OccupancyPage.tsx`.

Gantt-Chart: Y-Achse = Rooms (gruppiert nach Location → Apartment), X-Achse = Zeit (Wochen, scrollbar). Implementierung: HTML/CSS Grid oder eine leichtgewichtige Bibliothek. Kein D3 oder schwere Libs.

Farbcodierung der Balken:
- Blau: Aktiver Tenant (moveOut = null)
- Orange: Gekündigt (moveOut gesetzt)
- Grün: Reservierung (Booking status in PENDING...DEPOSIT_PENDING)
- Rot: Room.status = BLOCKED
- Leer: Vacant

Klick auf Balken → Folio. Klick auf leeren Bereich → "Create booking" (Phase 2 manueller Booking-Flow).

Nav erweitern: `{ href: "/admin/occupancy", label: "Occupancy" }`

### 3.3 Bescheinigungen

PDF-Generierung für:
- **Mietschuldenfreiheitsbescheinigung:** Bestätigt dass keine Mietrückstände bestehen. Daten aus RentPayment. Template als HTML → PDF (z.B. via puppeteer oder html-pdf-node).
- **Wohnungsbestätigung (§19 BMG):** Vermieterbescheinigung für Einwohnermeldeamt. Pflichtfelder: Name, Geburtsdatum, Einzugsdatum, Adresse der Wohnung.

API-Route: `app/api/admin/tenants/[id]/certificate/route.ts` → GET mit `?type=rent_clearance` oder `?type=residence_confirmation` → returns PDF.

Im Aktions-Dropdown der Mieterübersicht und im Folio als Button verfügbar.

### 3.4 Housekeeping Clusterliste

Neue Seite: `app/admin/housekeeping/page.tsx`.

Schema: CleaningTask (siehe Phase 1 Schema, falls noch nicht erstellt — dann hier erstellen).

Tagesansicht: Datum-Picker, Location-Filter. Tabelle: Zimmer, Typ (Move-in/out), Status (Open/In Progress/Done), zugewiesene Person, Notizen. Status per Button umschaltbar.

Datenquelle Long-Stay: Tenants mit moveIn = heute oder moveOut = heute.
Datenquelle Short-Stay (Apaleo): Bestehende lib/apaleo.ts erweitern um Reservierungsabfrage. Reservierungen mit arrival/departure = heute → als CleaningTask eintragen.

---

## PHASE 4: Finance + Rollen + Audit (Wochen 13–16)

### 4.1 Finance Dashboard erweitern

`/admin/rent` wird zu `/admin/finance`. Bestehende RentPage als Sub-Tab "Rent Roll".

Neue Ansichten:
- **Umsatzübersicht:** Monatsweise, filterbar nach Location. Summe aus: RentPayments (paid) + Booking Fees (aus Booking.bookingFeePaidAt) + ExtraCharges.
- **Kautionskonto:** SUM aller depositAmount WHERE depositStatus = RECEIVED, pro Location.
- **Mietrückstände:** Gruppiert nach Location, einzeln mit Link zum Folio.
- **DATEV-CSV-Export:** Button "Export DATEV" → generiert CSV mit: Buchungsdatum, Belegnummer, Betrag, Steuerschlüssel, Gegenkonto, Buchungstext. Konfigurierbar: SKR03 oder SKR04.

### 4.2 Rollen & Berechtigungen

Neues User-Modell im Schema. Migration von admin-auth.ts (Cookie + Passwort) zu Supabase Auth mit Rollen.

Rollen: ADMIN (alles), OPERATIONS (Mieter, Bookings, Deposits, Housekeeping, Occupancy), FINANCE (Finance, DATEV-Export), HOUSEKEEPING (nur Clusterliste).

Middleware: Rolle aus Session prüfen, Zugriff auf Routes einschränken.

### 4.3 Audit Log

Neues AuditLog-Modell. Bei jeder schreibenden Admin-API-Route: AuditLog-Eintrag mit user_id, action, entity_type, entity_id, old_value, new_value.

Ansicht: `/admin/settings/audit-log` — Tabelle, filterbar nach User, Modul, Zeitraum.

---

## PHASE 5: Kommunikation + Integrationen (Wochen 17–20)

### 5.1 E-Mail Template Editor
- Neues EmailTemplate-Modell in DB
- Admin-UI unter `/admin/settings/email-templates`
- WYSIWYG Editor (z.B. TipTap) mit Variable-Dropdown
- Bestehende hardcoded Templates aus lib/email/ migrieren
- EmailLog-Modell für Tracking aller gesendeten Mails

### 5.2 WhatsApp Business API
- WhatsApp Cloud API (Meta) Integration
- Senden/Empfangen im Folio Tab 5 (Timeline)
- WhatsAppMessage-Modell
- Webhook für eingehende Nachrichten
- Template Messages (müssen von Meta approved werden)

### 5.3 Google Drive Integration
- OAuth Setup
- Automatische Ordnerstruktur: STACEY/[Location]/[Zimmer]/[Mietername]
- PDF-Upload bei Vertragsgenerierung und Bescheinigungen
- Links im Folio Tab 6

### 5.4 Apaleo-Erweiterung
- Bestehende lib/apaleo.ts erweitern
- Reservierungen mit Check-in/Check-out abrufen
- In Housekeeping-Clusterliste integrieren

---

## Generelle Regeln für alle Phasen

1. **Jede Phase als separate PRs.** Nicht alles auf einmal.
2. **Migrations müssen reversible sein.** Keine destruktiven Schema-Änderungen.
3. **Bestehende Tests nicht brechen.** `lib/availability.test.ts` und `lib/api-response.test.ts` existieren.
4. **Kein Over-Engineering.** Einfache Lösungen bevorzugen. Keine State-Management-Libraries (React Context reicht), keine CSS-in-JS, kein Storybook.
5. **Error-Handling:** `reportError()` aus `lib/observability.ts` für alle catch-Blöcke in API-Routes.
6. **Test-Mode beachten:** Bestehende `isTestMode()` und `canSendEmail()` Logik aus `lib/test-mode.ts` muss in allen neuen E-Mail-Funktionen berücksichtigt werden.
7. **Beträge immer in Cent.** Int, nicht Float. Anzeige: `(cents / 100).toFixed(0)` für ganze Euro, `.toFixed(2)` wenn Nachkommastellen nötig.
8. **Keine neuen Dependencies** ohne Rücksprache. Bestehende: lucide-react für Icons, framer-motion nur für Hero.

---

## Zusammenfassung: Was existiert vs. was zu bauen ist

| Modul | Status | Aktion |
|-------|--------|--------|
| Booking Pipeline | ✅ Komplett | Kanban-View ergänzen, Widerruf-Button |
| Mieterübersicht | ✅ Basis | Spalten, Sortierung, Aktions-Dropdown, Klick-zu-Folio |
| Mieter-Folio | ❌ Fehlt | Komplett neu (6 Tabs) |
| Command Center | ❌ Fehlt | Komplett neu (KPIs, Vacancy, Actions, Move-in/out) |
| Belegungsplan | ❌ Fehlt | Komplett neu (Gantt-Chart) |
| Kautionsabrechnung | ✅ Basis | Mängel-Einträge, automatische Mail-Logik |
| Rent/Finance | ✅ Basis | Umsatzübersicht, DATEV-Export |
| Rooms/Property | ✅ Anzeige | CRUD, Preisverwaltung, Sperren |
| E-Mail Templates | ✅ Hardcoded | UI-Editor, DB-basiert |
| Housekeeping | ❌ Fehlt | Komplett neu (Clusterliste + Apaleo) |
| Rollen/Audit | ❌ Fehlt | Komplett neu |
| Dokumente/Drive | ❌ Fehlt | Komplett neu |
| WhatsApp | ❌ Fehlt | Komplett neu |

**Starte mit Phase 1.** Frag mich bei Unklarheiten.
