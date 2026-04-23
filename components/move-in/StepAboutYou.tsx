"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { StayType } from "@/lib/data";

// ─── Country data ─────────────────────────────────────────────
// Full ISO 3166-1 list so guests from anywhere find their country.
// "Popular" (German + neighbours + main EU + US/UK) surface first when the
// search box is empty; everything else falls in A–Z.

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (DRC)" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "XK", name: "Kosovo" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

// Ordered — Germany first since most stays are booked from there, then
// neighbours, then the big EU markets + UK/US that drive our inbound.
const POPULAR_ORDER = ["DE", "AT", "CH", "NL", "FR", "IT", "ES", "GB", "US"];
const POPULAR_SET = new Set(POPULAR_ORDER);

// ─── Validation ───────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(v: string) {
  return EMAIL_RE.test(v.trim());
}

function isValidPhone(v: string) {
  // Strip formatting, require at least 7 digits (shortest national phone is ~7).
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7;
}

function isValidDOB(v: string) {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const age = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return age >= 16 && age < 120;
}

// ─── Small primitives ─────────────────────────────────────────

// Section header — short uppercase label, sits directly above a group of
// fields. Subtle but gives the form a clear scan pattern.
function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// Floating-label input. The label starts as placeholder-inside-box, then
// shrinks into the top-left corner when the field is focused or has a
// value. Compact, premium, and keeps the form legible on mobile.
//
// A small check icon appears on the right when the field passes
// validation, and a red helper line shows below once the user has
// tabbed/blurred out of an invalid field (no angry red on first keystroke).
function FloatingField({
  label,
  value,
  onChange,
  type = "text",
  required,
  validate,
  invalidMessage,
  autoComplete,
  inputMode,
  name,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  validate?: (v: string) => boolean;
  invalidMessage?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal" | "search" | "url" | "none";
  name?: string;
  max?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const filled = value.length > 0;
  // Date inputs always render the browser's format placeholder (e.g.,
  // "tt.mm.jjjj" in German) in the value area, which would collide with
  // a centered floating label. Lift the label permanently for dates.
  const floating = focused || filled || type === "date";

  const valid = validate ? validate(value) : filled;
  const showError = touched && !focused && required && filled && validate && !valid;
  const showCheck = valid && filled;

  return (
    <div>
      <div
        className={clsx(
          "relative rounded-[5px] border bg-white transition-colors",
          showError
            ? "border-[#FF6B6B]"
            : focused
              ? "border-black"
              : "border-[#E8E6E0]",
        )}
      >
        <label
          className={clsx(
            "pointer-events-none absolute left-4 transition-all duration-150",
            floating
              ? "top-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray"
              : "top-1/2 -translate-y-1/2 text-base text-[#999] sm:text-sm",
          )}
        >
          {label}
          {required && " *"}
        </label>
        <input
          type={type}
          name={name}
          value={value}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTouched(true);
          }}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={clsx(
            "w-full rounded-[5px] bg-transparent px-4 pb-2 pt-6 text-base outline-none sm:text-sm",
            // Keep browser-native date picker icon visible
            type === "date" && "[color-scheme:light]",
          )}
        />
        {showCheck && (
          <Check
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#2E8B57]"
          />
        )}
      </div>
      {showError && invalidMessage && (
        <p className="mt-1 pl-1 text-xs text-[#FF6B6B]">{invalidMessage}</p>
      )}
    </div>
  );
}

// Date-of-birth field as three native <select>s: Day / Month / Year.
// Cleaner than <input type="date"> which ships with a format placeholder
// (e.g., "tt.mm.jjjj") and a dated popup calendar. Native selects look
// consistent across browsers, open the OS wheel picker on mobile, and
// let us cap the year range at 16 years ago — the minimum booking age.
function DateOfBirthField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
}) {
  const [touched, setTouched] = useState(false);

  // Own the three dimensions locally — otherwise picking one dropdown
  // at a time would push an empty-string back to the parent before the
  // other two are filled, wiping the select UI on the next render.
  const [local, setLocal] = useState<{ day: string; month: string; year: string }>(
    () => {
      if (value) {
        const [y, m, d] = value.split("-");
        return { day: String(Number(d)), month: String(Number(m)), year: y };
      }
      return { day: "", month: "", year: "" };
    },
  );

  // Sync from parent when the prop changes externally (e.g., a form
  // reset). Equality-guarded so editing locally doesn't trigger an
  // echo-back loop.
  useEffect(() => {
    setLocal((prev) => {
      if (!value) {
        if (!prev.day && !prev.month && !prev.year) return prev;
        return { day: "", month: "", year: "" };
      }
      const [y, m, d] = value.split("-");
      const next = { day: String(Number(d)), month: String(Number(m)), year: y };
      if (prev.day === next.day && prev.month === next.month && prev.year === next.year) {
        return prev;
      }
      return next;
    });
  }, [value]);

  const now = new Date();
  const maxYear = now.getFullYear() - 16; // must be 16+ to book
  const minYear = now.getFullYear() - 100;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [maxYear, minYear]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Days adapt to the chosen month + year (Feb 29 only in leap years).
  const days = useMemo(() => {
    const y = parseInt(local.year) || 2000;
    const m = parseInt(local.month) || 1;
    const n = new Date(y, m, 0).getDate();
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [local.year, local.month]);

  const update = (field: "day" | "month" | "year", v: string) => {
    const next = { ...local, [field]: v };
    setLocal(next);
    if (next.day && next.month && next.year) {
      onChange(
        `${next.year}-${next.month.padStart(2, "0")}-${next.day.padStart(2, "0")}`,
      );
    } else if (value) {
      // Parent had a committed date but the user just cleared part of it.
      // Blank out the parent so validation elsewhere doesn't keep an old ISO.
      onChange("");
    }
  };

  const complete = !!(local.day && local.month && local.year);
  const iso = complete
    ? `${local.year}-${local.month.padStart(2, "0")}-${local.day.padStart(2, "0")}`
    : "";
  const valid = complete && isValidDOB(iso);
  const showError = touched && complete && !valid;

  return (
    <div onBlur={() => setTouched(true)}>
      <p className="mb-2 pl-1 text-[10px] font-semibold uppercase tracking-widest text-gray">
        Date of birth{required && " *"}
      </p>
      <div className="grid grid-cols-[1fr_1.6fr_1.3fr] gap-2">
        <DobSelect
          aria="Day"
          value={local.day}
          onChange={(v) => update("day", v)}
          placeholder="Day"
          options={days.map((d) => ({ value: String(d), label: String(d) }))}
          invalid={showError}
        />
        <DobSelect
          aria="Month"
          value={local.month}
          onChange={(v) => update("month", v)}
          placeholder="Month"
          options={months.map((name, i) => ({ value: String(i + 1), label: name }))}
          invalid={showError}
        />
        <DobSelect
          aria="Year"
          value={local.year}
          onChange={(v) => update("year", v)}
          placeholder="Year"
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          invalid={showError}
        />
      </div>
      {showError && (
        <p className="mt-1 pl-1 text-xs text-[#FF6B6B]">
          You must be at least 16 years old.
        </p>
      )}
    </div>
  );
}

function DobSelect({
  aria,
  value,
  onChange,
  placeholder,
  options,
  invalid,
}: {
  aria: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  invalid?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative rounded-[5px] border bg-white transition-colors focus-within:border-black",
        invalid ? "border-[#FF6B6B]" : "border-[#E8E6E0]",
      )}
    >
      <select
        aria-label={aria}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "w-full cursor-pointer appearance-none rounded-[5px] bg-transparent py-3.5 pl-4 pr-8 text-base outline-none sm:text-sm",
          value ? "text-black" : "text-[#999]",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray"
      />
    </div>
  );
}

// Searchable country combobox. Type to filter; click a row to select.
// Closes on outside click, Escape, or selection. Popular countries
// surface at the top when the query is empty.
function CountryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value) || null;

  // Filter + sort. With empty query: popular first in their defined order,
  // then A-Z. With query: matches across name + code, ranked by prefix hit.
  const options = useMemo(() => {
    if (!query.trim()) {
      const byCode = new Map(COUNTRIES.map((c) => [c.code, c] as const));
      const popular = POPULAR_ORDER.map((code) => byCode.get(code)!).filter(Boolean);
      const rest = COUNTRIES.filter((c) => !POPULAR_SET.has(c.code)).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return [...popular, ...rest];
    }
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
      .sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        return a.name.localeCompare(b.name);
      });
  }, [query]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-focus the search input when opened.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center justify-between rounded-[5px] border bg-white px-4 py-4 text-left transition-colors",
          open ? "border-black" : "border-[#E8E6E0] hover:border-[#C7C7C7]",
        )}
      >
        <span className="flex flex-col items-start">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray">
            Country *
          </span>
          <span
            className={clsx(
              "mt-0.5 text-base sm:text-sm",
              selected ? "text-black" : "text-[#999]",
            )}
          >
            {selected?.name ?? "Select country"}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={clsx("text-gray transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[5px] border border-[#E8E6E0] bg-white shadow-lg">
          <div className="relative border-b border-[#F0F0F0]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries"
              className="w-full bg-transparent py-3 pl-9 pr-9 text-base outline-none sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[3px] p-1 text-gray hover:bg-[#F5F5F5]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <ul className="max-h-[260px] overflow-y-auto py-1" role="listbox">
            {options.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray">No match</li>
            )}
            {options.map((c) => {
              const isSelected = c.code === value;
              return (
                <li key={c.code} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                      isSelected ? "bg-[#F5F5F5] font-semibold" : "hover:bg-[#F7F7F7]",
                    )}
                  >
                    <span>{c.name}</span>
                    {isSelected && <Check size={14} className="text-black" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function StepAboutYou({
  stayType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phone,
  setPhone,
  dateOfBirth,
  setDateOfBirth,
  street,
  setStreet,
  zipCode,
  setZipCode,
  addressCity,
  setAddressCity,
  country,
  setCountry,
}: {
  stayType: StayType;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone?: string;
  setPhone?: (v: string) => void;
  dateOfBirth?: string;
  setDateOfBirth?: (v: string) => void;
  street?: string;
  setStreet?: (v: string) => void;
  zipCode?: string;
  setZipCode?: (v: string) => void;
  addressCity?: string;
  setAddressCity?: (v: string) => void;
  country?: string;
  setCountry?: (v: string) => void;
  // Accepted for backward compat but not rendered here — reason/message
  // collection, if we want it, should be its own step.
  moveInReason?: string;
  setMoveInReason?: (v: string) => void;
  message?: string;
  setMessage?: (v: string) => void;
}) {
  const isLong = stayType === "LONG";

  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        Tell us about <em className="not-italic font-bold italic">you</em>
      </h2>
      <p className="mt-2 text-sm text-gray">
        {isLong
          ? "Almost there — a few details and we'll prepare your lease."
          : "Almost there — just the essentials so we can confirm your stay."}
      </p>

      <div className="mt-8 space-y-8">
        {/* ── Identity ─────────────────────────────────────── */}
        <Section title="Identity">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FloatingField
              label="First name"
              value={firstName}
              onChange={setFirstName}
              required
              validate={(v) => v.trim().length >= 2}
              invalidMessage="Please enter your first name."
              autoComplete="given-name"
              name="firstName"
            />
            <FloatingField
              label="Last name"
              value={lastName}
              onChange={setLastName}
              required
              validate={(v) => v.trim().length >= 2}
              invalidMessage="Please enter your last name."
              autoComplete="family-name"
              name="lastName"
            />
          </div>
          <DateOfBirthField
            value={dateOfBirth || ""}
            onChange={(v) => setDateOfBirth?.(v)}
            required
          />
        </Section>

        {/* ── Contact ──────────────────────────────────────── */}
        <Section title="Contact">
          <FloatingField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            validate={isValidEmail}
            invalidMessage="Enter a valid email address."
            autoComplete="email"
            inputMode="email"
            name="email"
          />
          <FloatingField
            label="Phone"
            type="tel"
            value={phone || ""}
            onChange={(v) => setPhone?.(v)}
            required
            validate={isValidPhone}
            invalidMessage="Enter a valid phone number."
            autoComplete="tel"
            inputMode="tel"
            name="phone"
          />
        </Section>

        {/* ── Address ──────────────────────────────────────── */}
        <Section title="Current address">
          <FloatingField
            label="Street & number"
            value={street || ""}
            onChange={(v) => setStreet?.(v)}
            required
            validate={(v) => v.trim().length >= 3}
            invalidMessage="Please enter your street and number."
            autoComplete="street-address"
            name="street"
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <FloatingField
                label="Zip"
                value={zipCode || ""}
                onChange={(v) => setZipCode?.(v)}
                required
                validate={(v) => v.trim().length >= 3}
                invalidMessage="Required."
                autoComplete="postal-code"
                inputMode="numeric"
                name="zip"
              />
            </div>
            <div className="col-span-2">
              <FloatingField
                label="City"
                value={addressCity || ""}
                onChange={(v) => setAddressCity?.(v)}
                required
                validate={(v) => v.trim().length >= 2}
                invalidMessage="Please enter your city."
                autoComplete="address-level2"
                name="city"
              />
            </div>
          </div>
          <CountryCombobox value={country || ""} onChange={(v) => setCountry?.(v)} />
        </Section>

        {/* Reassurance — sets context at the bottom so users submitting
            personal data see the privacy promise before the CTA. */}
        <p className="pt-2 text-xs text-gray">
          We only use these details to confirm your booking. Never shared, never sold.
        </p>
      </div>
    </div>
  );
}
