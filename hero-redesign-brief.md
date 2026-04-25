# STACEY Hero — Redesign Brief

Ziel: vom statischen Hero (Foto + Headline + zwei Boxen) zu einem cinematischen Entrance mit klarer Marken-Signatur. Brand-Fundament bleibt unverändert (Montserrat + italic Serif, Pink `#FCB0C0`, Schwarz `#1A1A1A`, warm-lit Interior). Keine Gimmicks — nur gezielte Bewegung mit Intention.

---

## Änderungen im Überblick

1. **Background**: statisches Foto → Video-Loop mit Image-Fallback + langsamer Ken-Burns-Zoom
2. **Headline**: erscheint word-by-word mit Reveal-Animation; `home.` bekommt animierten Pink-Unterstrich
3. **Stay-Choice**: zwei separate Boxen → animierter Toggle mit gleitender weißer Pille
4. **Neu**: Scroll-Indicator unten-mittig
5. **Nav**: Hover-Underline auf City-Links, leichter Hover-Scale auf Logo, cleaner MOVE-IN Button
6. **Legibility**: fester Gradient-Overlay, damit Text unabhängig vom Background-Content lesbar bleibt

---

## Background

- **Primär**: kurzer MP4/WebM Loop (10–15s, muted, `autoplay`, `loop`, `playsInline`, `preload="metadata"`). Content: langsamer Schwenk durch ein warm ausgeleuchtetes Zimmer (Mühlenkamp oder Eppendorf).
- **Poster-Image**: high-res JPG als `poster` Attribut am Video UND als Fallback wenn kein Video übergeben wird. Dient auch als First-Paint-Frame.
- **Ken-Burns-Effect**: CSS Keyframe `scale(1.02) → scale(1.12)` über 22s `ease-out`, nicht loopend (läuft einmal beim Mount). Gibt sowohl Video als auch Image zusätzliche Lebendigkeit.
- **Overlay**: linear-gradient `rgba(0,0,0,0.35)` oben → `rgba(0,0,0,0.15)` Mitte (40%) → `rgba(0,0,0,0.55)` unten. Sichert Lesbarkeit.
- **Reduced-Motion**: kein Ken-Burns, Bild/Video bleibt statisch.

---

## Headline Animation

Zwei Zeilen:
- Zeile 1: `OUR MEMBERS`
- Zeile 2: `CALL US home.`

Mechanik: Jede Zeile ist ein Container mit `overflow: hidden`. Jedes Wort darin ist ein `inline-block` mit initial `translateY(110%)`. Animation slidet auf `translateY(0)` — das erzeugt den "Word erscheint hinter einer Masken-Linie" Effect.

**Timing** (Sekunden, Delay ab Page-Load):
| Wort | Delay |
|---|---|
| OUR | 0.10s |
| MEMBERS | 0.22s |
| CALL | 0.34s |
| US | 0.42s |
| home. | 0.52s |

- Duration pro Wort: 1.05s
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)

**`home.`-Word**:
- Font: italic Serif (Tailwind Token `font-serif`)
- Case: lowercase
- Size: 1.15× der umgebenden Schriftgröße
- Tracking: -0.02em
- Nach dem Reveal (bei **1.3s** Delay) zeichnet sich Pink-Unterstrich (`#FCB0C0`, 3px hoch) von links nach rechts ein:
  - `scaleX(0) → scaleX(1)`, `transform-origin: left`
  - Duration 0.9s, Easing `cubic-bezier(0.77, 0, 0.175, 1)` (ease-in-out-quart)
  - Positionierung: `inset-x-[0.15em] bottom-[0.14em]` (damit er dem Glyph folgt)

**Reduced-Motion**: alle Wörter sofort sichtbar, Unterstrich sofort `scaleX(1)`.

---

## Subtitle + Toggle Entrance

- **Subtitle** `"How long do you want to stay?"`: fade + 8px slide-up, Duration 0.7s, Delay **1.5s**, gleiches ease-out-expo
- **Toggle**: fade + 8px slide-up, Duration 0.7s, Delay **1.7s**
- **Scroll-Indicator**: nur fade-in, Delay **2.0s**

Gestaffelt damit der Blick sauber geführt wird: Headline → Zeile 2 → Subtitle → CTA → Scroll-Hint.

---

## Stay Toggle

Ersetzt die aktuellen zwei SHORT/LONG Boxen durch eine einzelne Pill-Gruppe.

**Aufbau**:
- Container: `bg-black/25`, `border border-white/25`, `rounded-[3px]`, padding 4px
- Zwei Buttons nebeneinander, je `min-width: 140px`, padding `12px 32px`
- Jeder Button: großes Label (`SHORT`/`LONG`, 12px, weight 700, tracking 0.18em, uppercase) + kleine Subline (`up to 3 months`/`stay 3+ months`, 9px, weight 500, opacity 0.7, normal case)

**Pille (Indicator)**:
- Weißer Block absolut positioniert, width `calc(50% - 4px)`, höhe `calc(100% - 8px)`, `rounded-[2px]`
- Beim Klick auf LONG: animate `x: 0% → 100%` via Framer Motion
- Duration 0.55s, Easing `cubic-bezier(0.77, 0, 0.175, 1)`
- Wichtig: `transform` nutzen, nicht `left` — bleibt auf GPU, smooth auf Mobile

**Button-Text-Farbe**:
- Aktiver Button (dort wo die Pille ist): `text-[#1A1A1A]`
- Inaktiver Button: `text-white`
- Transition: `color 0.3s ease`

**Default**: SHORT ausgewählt.

**Props / API**:
- `defaultMode?: "short" | "long"` (default: `"short"`)
- `onSelectMode?: (mode: "short" | "long") => void` — Callback damit Parent entscheidet (z.B. Router-Push zu `/rooms?stay=short`)

**Accessibility**:
- Container: `role="radiogroup"`, `aria-label="Stay length"`
- Jeder Button: `role="radio"`, `aria-checked={active}`, `type="button"`

---

## Scroll Indicator

Neu unten-mittig positioniert:
- Container: `absolute bottom-6 left-1/2 -translate-x-1/2`, `pointer-events-none` (damit er keine Klicks abfängt)
- Label `"SCROLL"` in 10px, weight 500, tracking `0.35em`, weiß
- Darunter 8px gap, dann vertikale Linie: 1px breit, 28px hoch, `bg-white/30`, `overflow: hidden`
- Innen ein absolut positionierter weißer Bar (full-fill), der via CSS-Keyframe animiert:
  - `0% { translateY(-100%); } 50% { translateY(0); } 100% { translateY(100%); }`
  - Duration 2.2s, `ease-in-out`, infinite
- Entrance: fade-in, Delay 2.0s

Bewusst CSS-Keyframe (kein Framer Motion) — es ist eine dauerhafte, state-unabhängige Animation. Spart Render-Overhead.

---

## Nav Polish

- **Logo** (STACEY Pink-Pille): Hover → `scale(1.03)`, Transition 0.3s
- **City-Links** (`HAMBURG`, `BERLIN`, `VALLENDAR`): 11px, weight 500, tracking 0.14em, uppercase. Bei Hover: Pink-Unterstrich zeichnet sich ein — bei Mouse-Enter von links nach rechts (`transform-origin: right → left`), bei Mouse-Leave wieder raus. Duration 0.5s, Easing `cubic-bezier(0.77, 0, 0.175, 1)`.
- **MOVE IN Button**: border `rgba(255,255,255,0.55)`, Hover → weißer Fill + schwarze Schrift, Transition 0.3s

---

## Viewport / Sizing

- Section-Höhe: `h-[100svh]` (small viewport height, verhindert iOS Safari Address-Bar-Chaos)
- Min-Höhe: `720px` (damit auf kleinen Laptop-Screens nichts abgeschnitten wird)
- Headline font-size: `clamp(3.25rem, 9.5vw, 8.5rem)` — scaliert smooth zwischen Mobile und Desktop
- Horizontal padding: `px-6` mobile, `px-10` desktop (24px / 40px)

---

## Tech-Abhängigkeiten

- **Framer Motion** (`framer-motion`) — für Word-Reveals, Toggle-Pill-Animation, Entrance-Staggering. Falls noch nicht im Projekt: `npm install framer-motion`.
- **Zwei neue CSS-Keyframes** in `globals.css`:
  - `scroll-line` (0%/50%/100% für den Scroll-Bar)
  - `hero-ken-burns` (scale 1.02 → 1.12)
- **`--font-serif` Token** in Tailwind v4 `@theme` falls noch nicht vorhanden. Empfehlung: **Cormorant Garamond** (Google Fonts, gratis) oder **PP Editorial New** (kommerziell).
- **`useReducedMotion()`** Hook von Framer Motion für Accessibility.

---

## Accessibility (durchgängig)

- `useReducedMotion()` an oberster Stelle der Komponente. Wenn aktiv:
  - Alle Entrance-Animationen skippen (Wörter sofort sichtbar, Unterstrich sofort da, Toggle sofort sichtbar, Scroll-Indicator sofort sichtbar)
  - Ken-Burns nicht starten
  - Scroll-Line-Animation stoppen (via global `prefers-reduced-motion: reduce` Media Query in globals.css)
- Video: `aria-hidden="true"`, keine Audio-Track benötigt
- Toggle: korrekte ARIA-Roles (siehe oben)
- Scroll-Indicator: `pointer-events: none`
- Skeleton/LCP: Poster-Image fungiert als LCP-Element, Video wird erst danach geladen (`preload="metadata"`)

---

## Was bleibt unverändert

- **Farb-Tokens**: Pink `#FCB0C0`, Schwarz `#1A1A1A`, Weiß auf Text
- **Font-Stack**: Montserrat Display + italic Serif
- **Copy**: "OUR MEMBERS CALL US HOME.", "How long do you want to stay?", "SHORT / LONG" mit Sublines
- **Overall Komposition**: Logo links, Nav mittig, MOVE IN rechts, Headline zentriert, Subtitle + Toggle darunter, Scroll-Indicator unten
- **Routing-Logik**: Toggle ist presentational, Parent entscheidet über `onSelectMode` Callback was passiert

---

## Fragen an Claude Code für die Integration

1. Wo sitzt der aktuelle Hero-Component und wie ist er aufgebaut — ein großer File oder schon in Sub-Components zerlegt?
2. Ist `framer-motion` bereits im Projekt oder brauchen wir den Install?
3. Ist der `--font-serif` Token in `@theme` schon gesetzt, und auf welche Font-Family?
4. Gibt es bestehende Animation-Utilities / Konstanten im Projekt (Easing-Tokens, Delays) — sollen wir die wiederverwenden oder neu anlegen?
5. Wie wird aktuell zum Booking-Flow navigiert, wenn der User Stay-Mode wählt? (Damit wir die `onSelectMode` Callback-Signatur richtig anbinden.)
6. Gibt es bereits ein Video-Asset im `/public` Verzeichnis, oder müssen wir mit Image-Only starten und Video später nachziehen?
