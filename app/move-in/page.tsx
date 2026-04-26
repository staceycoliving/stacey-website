"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  Pencil,
  Check,
  Mail,
  MapPin,
  Ruler,
  Users,
  Search,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Badge from "@/components/ui/Badge";
import StepAboutYou from "@/components/move-in/StepAboutYou";
import StepLease from "@/components/move-in/StepLease";
import SearchFields from "@/components/move-in/SearchFields";
import JourneyStrip from "@/components/move-in/JourneyStrip";
import BrunoWidget from "@/components/move-in/BrunoWidget";
import { Reveal, SectionHeader, CollapsedSection } from "@/components/move-in/chrome";
import {
  locations,
  getLocationByRoomId,
  getRoomById,
  ROOM_NAME_TO_CATEGORY,
  formatMoveInLabel,
} from "@/lib/data";
import type { StayType } from "@/lib/data";
import { expandMoveInDates, isMoveInDateBookable, filterRoomsForPersons } from "@/lib/availability";
import { useAvailability } from "./_hooks/useAvailability";
import { useRoomPricing } from "./_hooks/useRoomPricing";
import { usePaymentConfirmation } from "./_hooks/usePaymentConfirmation";

// ─── Main export ───
export default function MoveInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 size={24} className="animate-spin text-gray" /></div>}>
      <MoveInFlow />
    </Suspense>
  );
}

// ─── The flow ───
function MoveInFlow() {
  const searchParams = useSearchParams();

  // ─── Lead source capture (UTM + referrer) ───
  // Read once on mount and stash in localStorage so it survives reloads /
  // step-back navigation during the booking flow. Whatever is in
  // localStorage when the booking POST fires gets sent along.
  const leadSourceRef = useRef<{
    source: string | null;
    medium: string | null;
    campaign: string | null;
    referrer: string | null;
  }>({ source: null, medium: null, campaign: null, referrer: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already captured earlier in this session? Re-use.
    try {
      const stored = window.localStorage.getItem("stacey_lead_source");
      if (stored) {
        leadSourceRef.current = JSON.parse(stored);
        return;
      }
    } catch {
      /* ignore corrupt storage */
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const source = params.get("utm_source");
    const medium = params.get("utm_medium");
    const campaign = params.get("utm_campaign");
    const referrerRaw = document.referrer || "";
    // Ignore referrer if it's our own domain (not useful)
    const referrer =
      referrerRaw && !referrerRaw.startsWith(window.location.origin)
        ? referrerRaw
        : null;
    const captured = { source, medium, campaign, referrer };
    leadSourceRef.current = captured;
    try {
      window.localStorage.setItem("stacey_lead_source", JSON.stringify(captured));
    } catch {
      /* ignore quota/private-mode */
    }
  }, []);

  // ─── Intro state (progressive fields) ───
  const [stayType, setStayType] = useState<StayType | null>(null);
  const [persons, setPersons] = useState<1 | 2>(1);
  const [city, setCity] = useState<string>("");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState<string | null>(null);

  // Read initial filter state from URL params (when coming from homepage
  // hero). If the URL has a complete filter set, skip straight to results.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URL(window.location.href).searchParams;
    const urlStayType = p.get("stayType");
    if (urlStayType !== "SHORT" && urlStayType !== "LONG") return;
    setStayType(urlStayType);
    const urlPersons = p.get("persons");
    if (urlPersons === "1" || urlPersons === "2") setPersons(Number(urlPersons) as 1 | 2);
    const urlCheckIn = p.get("checkIn");
    const urlCheckOut = p.get("checkOut");
    const urlCity = p.get("city");
    const urlMoveIn = p.get("moveIn");
    const urlRoom = p.get("room");
    if (urlCheckIn) setCheckIn(urlCheckIn);
    if (urlCheckOut) setCheckOut(urlCheckOut);
    if (urlCity) setCity(urlCity);
    if (urlMoveIn) setMoveInDate(urlMoveIn);
    // When arriving from the location page's "Book" button, auto-open
    // the clicked room so the user lands directly on the booking form.
    if (urlRoom) {
      setSelectedRoomId(urlRoom);
      setExpandedRoomId(urlRoom);
    }
    const complete =
      (urlStayType === "SHORT" && urlCheckIn && urlCheckOut) ||
      (urlStayType === "LONG" && urlCity && urlMoveIn);
    if (complete) setShowResults(true);
  }, []);

  // ─── Results + booking state ───
  const [showResults, setShowResults] = useState(false);
  // (defined later; used below for the URL-mirror effect)
  const [filterCalendarOpen, setFilterCalendarOpen] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomCollapsed, setRoomCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<"priceAsc" | "priceDesc" | "sizeAsc" | "sizeDesc">("priceAsc");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  // SHORT only
  const [phone, setPhone] = useState("");
  const [moveInReason, setMoveInReason] = useState("");
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  // LONG only
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Lease signing (LONG only)
  const [showLease, setShowLease] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [leaseDevMode, setLeaseDevMode] = useState(false);

  // Mirror filter state back into the URL as the user edits the sticky
  // filter bar. Shareable links, refresh-safe, plays well with back nav
  // and bfcache. Uses history.replaceState so there's no Next.js
  // re-render.
  //
  // IMPORTANT: skip the initial mount. On mount the state is empty
  // defaults, so writing to URL here would strip incoming query params
  // BEFORE the hydrate effect above reads them, leaving the /move-in
  // page on the intro hero instead of jumping to results.
  const mirrorMountedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mirrorMountedRef.current) {
      mirrorMountedRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (stayType) params.set("stayType", stayType);
    if (persons !== 1) params.set("persons", String(persons));
    if (stayType === "SHORT") {
      if (checkIn) params.set("checkIn", checkIn);
      if (checkOut) params.set("checkOut", checkOut);
    }
    if (stayType === "LONG") {
      if (city) params.set("city", city);
      if (moveInDate) params.set("moveIn", moveInDate);
    }
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [stayType, persons, city, checkIn, checkOut, moveInDate]);

  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const leaseRef = useRef<HTMLDivElement>(null);

  // ─── Availability + base prices (single hook) ───
  const { availability, loadingAvailability, basePrices } = useAvailability({
    stayType,
    persons,
    city,
    checkIn,
    checkOut,
    showResults,
  });

  // Helper: get nightly price for a room.
  // Once live availability has loaded for the location, only use the live (persons-aware)
  // price, basePrices are always fetched for 1 person and would lie for couples.
  const getNightlyPrice = (roomName: string, locSlug: string): number | null => {
    const cat = ROOM_NAME_TO_CATEGORY[roomName];
    if (!cat) return null;
    const liveLoaded = availability[locSlug] !== undefined;
    if (liveLoaded) return availability[locSlug]?.[cat]?.pricePerNight ?? null;
    return basePrices[locSlug]?.[cat] ?? null;
  };

  // LONG stay: build move-in dropdown options from API data using the shared
  // 14-day flexibility expansion helper.
  const moveInOptions: { value: string; label: string }[] = (() => {
    if (stayType !== "LONG" || !city) return [];
    const earliestDates: string[] = [];
    for (const locSlug of Object.keys(availability)) {
      const loc = locations.find((l) => l.slug === locSlug);
      if (!loc || loc.stayType !== "LONG" || loc.city !== city) continue;
      for (const catData of Object.values(availability[locSlug])) {
        if (catData.moveInDates) earliestDates.push(...catData.moveInDates);
      }
    }
    return expandMoveInDates(earliestDates).map((d) => ({
      value: d,
      label: formatMoveInLabel(d),
    }));
  })();

  // ─── Derived ───
  const selectedRoom = selectedRoomId ? getRoomById(selectedRoomId) ?? null : null;
  const selectedLocation = selectedRoomId ? getLocationByRoomId(selectedRoomId) ?? null : null;

  // Fetch pricing when a SHORT stay room is selected
  const { selectedRoomPricing, pricingLoading } = useRoomPricing({
    stayType,
    locSlug: selectedLocation?.slug ?? null,
    roomName: selectedRoom?.name ?? null,
    checkIn,
    checkOut,
    persons,
    availability,
  });

  // Helper: get availability count for a room at a location
  const hasAvailabilityData = Object.keys(availability).length > 0;
  const getRoomAvailability = (locSlug: string, roomName: string): number | null => {
    const cat = ROOM_NAME_TO_CATEGORY[roomName];
    if (!cat) return hasAvailabilityData ? 0 : null;
    if (!availability[locSlug]) return hasAvailabilityData ? 0 : null;
    const catData = availability[locSlug][cat];
    if (!catData) return 0;

    // SHORT stay: just return available count
    if (!catData.moveInDates) return catData.available;

    // LONG stay: shared 14-day flexibility rule
    if (!moveInDate) return catData.available;
    if (!isMoveInDateBookable(moveInDate, catData.moveInDates)) return 0;
    // catData.available is `freeNow` (rooms free TODAY); for a future moveInDate that
    // matches an earliest date, the category is bookable even if nothing is free today.
    return Math.max(catData.available, 1);
  };

  const filteredLocations = stayType
    ? locations
        .filter((l) => l.stayType === stayType)
        .filter((l) => stayType === "LONG" && city ? l.city === city : true)
        .map((l) => ({
          ...l,
          rooms: filterRoomsForPersons(l.rooms, persons)
            .filter((r) => {
              const avail = getRoomAvailability(l.slug, r.name);
              return avail === null || avail > 0; // null = still loading, show; 0 = sold out, hide
            }),
        }))
    : [];

  const totalRooms = filteredLocations.reduce((sum, l) => sum + l.rooms.length, 0);

  // ─── Calendar ───
  const handleCalendarSelect = (date: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else {
      if (date > checkIn) {
        setCheckOut(date);
      } else {
        setCheckIn(date);
        setCheckOut(null);
      }
    }
  };

  const handleCalendarClear = () => {
    setCheckIn(null);
    setCheckOut(null);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const nightCount =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;
  const tooShort = stayType === "SHORT" && nightCount > 0 && nightCount < 5;

  // ─── Intro handlers (reset downstream when upstream changes) ───
  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    setCity("");
    setCheckIn(null);
    setCheckOut(null);
    setMoveInDate(null);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handlePersonsChange = (p: 1 | 2) => {
    setPersons(p);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleCityChange = (c: string) => {
    setCity(c);
    setMoveInDate(null);
    setShowResults(false);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  // ─── Live filter handlers (keep results visible, just update filters) ───
  const handleStayTypeChangeLive = (type: StayType) => {
    setStayType(type);
    setCity("");
    setCheckIn(null);
    setCheckOut(null);
    setMoveInDate(null);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
    // SHORT needs dates first, flag to auto-open calendar in compact filter
    if (type === "SHORT") setFilterCalendarOpen(true);
  };

  const handlePersonsChangeLive = (p: 1 | 2) => {
    setPersons(p);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleCityChangeLive = (c: string) => {
    setCity(c);
    setMoveInDate(null);
    setSelectedRoomId(null);
    setExpandedRoomId(null);
    setRoomCollapsed(false);
  };

  const handleSearch = () => {
    setShowResults(true);
    setSelectedRoomId(null);
    setRoomCollapsed(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ─── Smart skip from URL params / reset on fresh visit / Stripe redirect ───
  const { confirmingPayment, confirmError } = usePaymentConfirmation(searchParams, {
    setStayType,
    setPersons,
    setCity,
    setCheckIn,
    setCheckOut,
    setMoveInDate,
    setShowResults,
    setSelectedRoomId,
    setRoomCollapsed,
    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setDateOfBirth,
    setStreet,
    setZipCode,
    setAddressCity,
    setCountry,
    setMoveInReason,
    setMessage,
    setTermsAccepted,
    setSubmitted,
    setSubmitting,
  });

  // ─── Scroll helper ───
  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  // ─── Room select ───
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setRoomCollapsed(true);
    scrollTo(aboutRef);
  };

  const editRoom = () => {
    setRoomCollapsed(false);
    setShowLease(false);
    setSigningUrl(null);
    setSignatureRequestId(null);
    scrollTo(resultsRef);
  };

  // ─── About complete? ───
  const isAboutComplete =
    firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== "" && phone.trim() !== "" &&
    dateOfBirth !== "" && street.trim() !== "" && zipCode.trim() !== "" && addressCity.trim() !== "" && country.trim() !== "";

  // ─── Submit / Next ───
  const handleSubmit = async () => {
    if (!isAboutComplete) return;
    // Non-refundable acknowledgment is required on both flows, button is
    // also disabled without it, this is a defensive second gate.
    if (!termsAccepted) return;

    // LONG stay → create booking in DB, then generate lease
    if (stayType === "LONG" && selectedLocation && selectedRoom) {
      setSubmitting(true);
      try {
        // 1. Create booking in DB
        const cat = ROOM_NAME_TO_CATEGORY[selectedRoom.name];
        const bookingRes = await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: selectedLocation.slug,
            category: cat,
            persons,
            moveInDate,
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            street,
            zipCode,
            addressCity,
            country,
            moveInReason,
            message,
            // Lead-source tracking, captured on page load from URL + referrer
            leadSource: leadSourceRef.current.source,
            leadMedium: leadSourceRef.current.medium,
            leadCampaign: leadSourceRef.current.campaign,
            leadReferrer: leadSourceRef.current.referrer,
          }),
        });
        const bookingBody = await bookingRes.json();
        if (!bookingBody?.ok) {
          if (bookingRes.status === 409) {
            alert("Sorry, this room type is no longer available. Please try a different category.");
            setSubmitting(false);
            return;
          }
          throw new Error(bookingBody?.error?.message || "Booking failed");
        }
        const bookingData = bookingBody.data;

        setBookingId(bookingData.id);

        // 2. Generate lease
        const res = await fetch("/api/lease", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: bookingData.id,
            firstName,
            lastName,
            dateOfBirth,
            street,
            zipCode,
            addressCity,
            country,
            email,
            locationName: selectedLocation.name,
            propertyAddress: selectedLocation.address,
            roomCategory: selectedRoom.name,
            monthlyRent: selectedRoom.priceMonthly,
            moveInDate,
          }),
        });
        const leaseBody = await res.json();
        if (!leaseBody?.ok) throw new Error(leaseBody?.error?.message || "Failed to generate lease");
        const data = leaseBody.data;

        setSigningUrl(data.signingUrl || null);
        setSignatureRequestId(data.signatureRequestId || null);
        setLeaseDevMode(data.devMode || false);
        setShowLease(true);
        setTimeout(() => leaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } catch (err) {
        console.error("Lease generation failed:", err);
        alert("Failed to generate lease. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Both stay types require the non-refundable acknowledgment before
    // we can kick off payment (button disable is the primary gate, this
    // is a defensive belt-and-braces check).
    if (!termsAccepted) return;
    if (!selectedLocation || !selectedRoom) return;
    setSubmitting(true);
    try {
      const cat = ROOM_NAME_TO_CATEGORY[selectedRoom.name];
      const res = await fetch("/api/checkout/short", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selectedLocation.slug,
          category: cat,
          persons,
          checkIn,
          checkOut,
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
          street,
          zipCode,
          addressCity,
          country,
          moveInReason,
          message,
          locationName: selectedLocation.name,
          roomName: selectedRoom.name,
        }),
      });
      const body = await res.json();
      if (!body?.ok) {
        if (res.status === 409) {
          alert("Sorry, this room type is no longer available for your dates. Please try a different category or dates.");
        } else {
          throw new Error(body?.error?.message || "Checkout failed");
        }
        setSubmitting(false);
        return;
      }
      // Redirect to Stripe
      window.location.href = body.data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Lease signed → redirect to Stripe Checkout ───
  const handleLeaseSigned = async () => {
    if (!selectedLocation || !selectedRoom) return;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          locationName: selectedLocation.name,
          roomName: selectedRoom.name,
          monthlyRent: selectedRoom.priceMonthly,
          moveInDate,
          firstName,
          lastName,
          email,
        }),
      });
      const body = await res.json();
      if (!body?.ok) throw new Error(body?.error?.message || "Checkout failed");
      // Redirect to Stripe hosted checkout
      window.location.href = body.data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("Payment setup failed. Please try again.");
    }
  };

  // ─── Format ───
  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatDateShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Search summary text
  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
  const searchSummary = stayType === "SHORT"
    ? `Short stay · ${persons === 2 ? "2 persons" : "1 person"}${checkIn && checkOut ? ` · ${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}` : ""}`
    : `Long stay${cityLabel ? ` · ${cityLabel}` : ""} · ${persons === 2 ? "2 persons" : "1 person"}${moveInDate ? ` · from ${formatDate(moveInDate)}` : ""}`;

  // ════════════════════════════════════════
  //  PAYMENT CONFIRMING / ERROR
  // ════════════════════════════════════════
  if (confirmingPayment) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-white pt-24">
          <div className="text-center">
            <Loader2 size={32} className="mx-auto animate-spin text-gray" />
            <p className="mt-4 text-sm text-gray">Confirming your booking...</p>
          </div>
        </main>
      </>
    );
  }

  if (confirmError) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-white pt-24">
          <div className="mx-auto max-w-md px-4 text-center">
            <p className="text-lg font-bold">Something went wrong</p>
            <p className="mt-2 text-sm text-gray">Your payment was successful but we couldn&apos;t confirm the booking automatically. Please contact us.</p>
            <p className="mt-4 rounded-[5px] bg-[#FAFAFA] p-3 text-xs font-mono text-gray break-all">{confirmError}</p>
            <a href="mailto:booking@stacey.de" className="mt-6 inline-block rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white">Contact booking@stacey.de</a>
          </div>
        </main>
      </>
    );
  }

  // ════════════════════════════════════════
  //  CONFIRMATION
  // ════════════════════════════════════════
  if (submitted && selectedLocation && selectedRoom) {
    const cm = selectedLocation.communityManager;
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white pt-24 pb-16 sm:pt-28">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <Reveal>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black">
                  <Check size={28} className="text-white" strokeWidth={3} />
                </div>
                <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
                  Welcome to <em className="font-bold italic">STACEY</em>, {firstName}!
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm text-gray leading-relaxed">
                  {stayType === "SHORT"
                    ? "Your booking is confirmed! We look forward to welcoming you."
                    : "Your room is reserved! Check your email for the deposit payment link."}
                </p>
                <div className="mx-auto mt-8 max-w-sm rounded-[5px] border border-[#E8E6E0] p-5 text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray">Your booking</p>
                  <div className="mt-3 flex gap-3">
                    <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-[5px]">
                      <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                      <p className="mt-0.5 text-xs text-gray">
                        {persons} {persons === 1 ? "person" : "persons"} ·{" "}
                        {moveInDate ? `from ${formatDate(moveInDate)}` : checkIn && checkOut ? `${formatDate(checkIn)}, ${formatDate(checkOut)}` : ""}
                      </p>
                    </div>
                  </div>
                  {stayType === "SHORT" && selectedRoomPricing && nightCount > 0 ? (
                    <div className="mt-4 space-y-1.5 border-t border-[#E8E6E0] pt-4 text-sm">
                      <div className="flex justify-between text-gray">
                        <span>{"\u20AC"}{selectedRoomPricing.perNight} × {nightCount} nights</span>
                        <span>{"\u20AC"}{selectedRoomPricing.totalGross.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray">
                        <span>incl. {selectedRoomPricing.vatPercent}% VAT</span>
                        <span>{"\u20AC"}{selectedRoomPricing.vatAmount.toFixed(2)}</span>
                      </div>
                      {selectedRoomPricing.cityTaxTotal > 0 && (
                        <div className="flex justify-between text-gray">
                          <span>City tax</span>
                          <span>{"\u20AC"}{selectedRoomPricing.cityTaxTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#E8E6E0] pt-1.5 font-bold">
                        <span>Total paid</span>
                        <span>{"\u20AC"}{selectedRoomPricing.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold">{"\u20AC"}{selectedRoom.priceMonthly}/mo</p>
                  )}
                </div>
                <div className="mx-auto mt-8 max-w-sm text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray">What happens next</p>
                  <div className="mt-4 space-y-3">
                    {(stayType === "SHORT"
                      ? ["You\u2019ll receive a confirmation email with all the details, including the registration form \u2014 please sign and return it before check-in.", "One day before your arrival, we\u2019ll send you a welcome email with your exact room assignment and all the info you need.", "Check-in is available from 4 PM on your arrival day."]
                      : ["We\u2019ve sent you an email with a payment link for your security deposit (2\u00D7 monthly rent).", "Please complete the deposit payment within 48 hours to secure your room.", "Once received, we\u2019ll send you a welcome email with check-in details 3 days before your move-in."]
                    ).map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-bold">{i + 1}</span>
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mx-auto mt-8 max-w-sm rounded-[5px] bg-black p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                      <Image src={cm.image} alt={cm.name} fill className="object-cover" sizes="56px" />
                      <div className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-black bg-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{cm.name}</p>
                      <p className="text-xs text-white/60">Your community manager</p>
                    </div>
                  </div>
                  <a href={`mailto:${cm.email}`} className="mt-4 flex items-center justify-center gap-2 rounded-[5px] bg-pink px-6 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:opacity-80">
                    <Mail size={14} /> Say hello
                  </a>
                </div>
                <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-black">
                  Back to homepage <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>
        </main>
      </>
    );
  }

  // ════════════════════════════════════════
  //  BOOKING FLOW
  // ════════════════════════════════════════
  return (
    <>
      <Navbar transparent={!showResults} />

      <main className="min-h-screen bg-white">
        {/* ── INTRO, hero image background, like homepage ──
             Natural top-down flow (no justify-center). When the form
             expands (LONG + grouped date pills) the content grows
             downward from the top instead of pushing the headline off
             the top edge. min-h-screen ensures the hero fills at least
             the viewport so short states (just stayType picked) don't
             leave dead space. */}
        {!showResults ? (
          <section className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-16 pt-28 sm:pt-32">
            {/* Hero background */}
            <Image
              src="/images/website-hero.webp"
              alt="STACEY Coliving"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 w-full max-w-md text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Move in with STACEY</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
                Find your new <em className="font-light italic">home</em>
              </h1>
              <p className="mt-3 text-sm text-white/50">
                Almost everything included · fully furnished · 9 locations · 3 cities
              </p>

              <SearchFields
                stayType={stayType} onStayType={handleStayTypeChange}
                persons={persons} onPersons={handlePersonsChange}
                city={city} onCity={handleCityChange}
                checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
                onCalendarClear={handleCalendarClear}
                moveInDate={moveInDate} onMoveInDate={(d) => { setMoveInDate(d); setShowResults(false); setSelectedRoomId(null); setRoomCollapsed(false); }}
                moveInOptions={moveInOptions} loadingDates={loadingAvailability}
                nightCount={nightCount} tooShort={tooShort}
                variant="full"
                onSubmit={handleSearch}
              />

              {/* Journey expectation strip + press logos. Both only show
                  in the initial state (before stayType is picked) so the
                  hero stays uncluttered once the user is mid-booking. */}
              {!stayType && (
                <>
                  <div className="mt-10">
                    <JourneyStrip tone="dark" />
                  </div>
                  <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">As seen in</span>
                    {["hamburger-abendblatt", "handelsblatt", "die-welt"].map((name) => (
                      <img key={name} src={`/images/press/${name}.svg`} alt={name} className="h-3 brightness-0 invert opacity-30 sm:h-3.5" />
                    ))}
                  </div>
                </>
              )}
            </motion.div>

          </section>
        ) : (
          /* ── STICKY FILTER PILL (floating, centered, not a full-width bar) ──
             pointer-events-none on the outer sticky band so the parts of
             the page to the LEFT/RIGHT of the pill stay clickable and
             scrollable. The pill itself re-enables pointer events. */
          <div className={clsx("pointer-events-none sticky top-16 z-30 flex justify-center px-4 py-3", (roomCollapsed || showLease) && "hidden")}>
            <div className="pointer-events-auto max-w-[calc(100vw-2rem)] rounded-[5px] bg-white px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
              <SearchFields
                stayType={stayType} onStayType={handleStayTypeChangeLive}
                persons={persons} onPersons={handlePersonsChangeLive}
                city={city} onCity={handleCityChangeLive}
                checkIn={checkIn} checkOut={checkOut} onCalendarSelect={handleCalendarSelect}
                onCalendarClear={handleCalendarClear}
                moveInDate={moveInDate} onMoveInDate={(d) => { setMoveInDate(d); setSelectedRoomId(null); setExpandedRoomId(null); setRoomCollapsed(false); }}
                moveInOptions={moveInOptions} loadingDates={loadingAvailability}
                nightCount={nightCount} tooShort={tooShort}
                variant="compact"
                calendarOpenExternal={filterCalendarOpen}
                setCalendarOpenExternal={setFilterCalendarOpen}
              />
            </div>
          </div>
        )}

        {/* ── EMPTY STATE: filter incomplete ── */}
        {showResults && !showLease && !filterCalendarOpen && !roomCollapsed && (
          (stayType === "SHORT" && (!checkIn || !checkOut || tooShort)) ||
          (stayType === "LONG" && (!city || !moveInDate))
        ) && (
          <section className="bg-white py-24">
            <div className="mx-auto max-w-md px-4 text-center">
              <p className="text-lg font-bold">Almost there</p>
              <p className="mt-2 text-sm text-gray">
                {stayType === "SHORT" && (!checkIn || !checkOut)
                  ? "Select your check-in and check-out dates to see available rooms."
                  : stayType === "SHORT" && tooShort
                    ? "Minimum stay is 5 nights. Please select a later check-out date."
                    : !city
                      ? "Select a city to see available rooms."
                      : "Select a move-in date to see available rooms."}
              </p>
            </div>
          </section>
        )}

        {/* ── RESULTS (like homepage search results) ── */}
        {showResults && !showLease && !filterCalendarOpen && !roomCollapsed && !(stayType === "SHORT" && (!checkIn || !checkOut || tooShort)) && !(stayType === "LONG" && (!city || !moveInDate)) && (
          <section ref={resultsRef} id="search-results" className="bg-[#FAFAFA] py-12 sm:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {loadingAvailability ? (
                      <span className="inline-flex items-center gap-3">
                        <Loader2 size={22} className="animate-spin" /> Checking availability…
                      </span>
                    ) : totalRooms > 0 ? (
                      <>
                        {totalRooms} {totalRooms === 1 ? "room" : "rooms"}{" "}
                        <span className="italic font-light">available</span>
                      </>
                    ) : (
                      <>No rooms <span className="italic font-light">match</span></>
                    )}
                  </h2>
                  <p className="mt-2 text-sm text-gray">{searchSummary}</p>
                </div>

                {/* Sort chips, only if there are results */}
                {totalRooms > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray">
                      Sort
                    </span>
                    {([
                      { key: "priceAsc", label: "Price ↑" },
                      { key: "priceDesc", label: "Price ↓" },
                      { key: "sizeAsc", label: "Size ↑" },
                      { key: "sizeDesc", label: "Size ↓" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={clsx(
                          "shrink-0 rounded-[5px] px-3 py-1.5 text-xs font-semibold transition-colors",
                          sortBy === opt.key
                            ? "bg-black text-white"
                            : "bg-white text-black ring-1 ring-lightgray hover:bg-[#F0F0F0]",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Location groups with room cards */}
              {!roomCollapsed && totalRooms > 0 && (
                <div className="mt-10 space-y-14">
                  {filteredLocations.map((loc) => {
                    const sortedRooms = [...loc.rooms].sort((a, b) => {
                      if (sortBy === "priceAsc") return a.priceMonthly - b.priceMonthly;
                      if (sortBy === "priceDesc") return b.priceMonthly - a.priceMonthly;
                      if (sortBy === "sizeAsc") return (a.sizeSqm ?? 999) - (b.sizeSqm ?? 999);
                      if (sortBy === "sizeDesc") return (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0);
                      return 0;
                    });
                    return (
                      <div key={loc.slug}>
                        {/* Location banner card */}
                        <Link
                          href={`/locations/${loc.slug}`}
                          className="group flex items-center gap-4 rounded-[5px] bg-white p-4 shadow-sm ring-1 ring-lightgray transition-all hover:shadow-md sm:p-5"
                        >
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[5px] sm:h-20 sm:w-20">
                            <Image
                              src={loc.images[0]}
                              alt={loc.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 64px, 80px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-extrabold tracking-tight sm:text-xl">
                              STACEY {loc.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-gray sm:text-sm">
                              {loc.neighborhood},{" "}
                              {loc.city.charAt(0).toUpperCase() + loc.city.slice(1)} · {loc.rooms.length}{" "}
                              {loc.rooms.length === 1 ? "room type" : "room types"}
                            </p>
                          </div>
                          <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-gray transition-all group-hover:translate-x-1 group-hover:text-black sm:flex">
                            View location <ArrowRight size={14} />
                          </span>
                        </Link>

                        {/* Room grid */}
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {sortedRooms.map((room) => {
                            const price =
                              stayType === "SHORT"
                                ? getNightlyPrice(room.name, loc.slug)
                                : room.priceMonthly;
                            const unit = stayType === "SHORT" ? "/night" : "/mo";
                            return (
                              <div
                                key={room.id}
                                className="group flex flex-col overflow-hidden rounded-[5px] bg-white shadow-sm transition-all duration-200 hover:shadow-lg"
                              >
                                <div className="relative aspect-[3/2] overflow-hidden">
                                  <Image
                                    src={room.image}
                                    alt={room.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                  />
                                  {room.forCouples && (
                                    <span className="absolute right-3 top-3 rounded-[5px] bg-pink px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                                      Couples OK
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-1 flex-col p-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-base font-extrabold tracking-tight">
                                        {room.name}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-gray">STACEY {loc.name}</p>
                                    </div>
                                    <p className="shrink-0 text-right text-2xl font-extrabold leading-none">
                                      €{price ?? room.priceMonthly}
                                      <span className="ml-0.5 text-[11px] font-normal text-gray">
                                        {unit}
                                      </span>
                                    </p>
                                  </div>

                                  {/* Amenity strip */}
                                  <div className="mt-4 flex flex-wrap gap-1.5">
                                    {room.sizeSqm && (
                                      <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#F5F5F5] px-2 py-1 text-[11px] font-semibold text-gray">
                                        <Ruler size={12} /> {room.sizeSqm} m²
                                      </span>
                                    )}
                                    {room.forCouples && (
                                      <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#F5F5F5] px-2 py-1 text-[11px] font-semibold text-gray">
                                        <Users size={12} /> 1-2 people
                                      </span>
                                    )}
                                    {room.name.toLowerCase().includes("balcony") && (
                                      <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#F5F5F5] px-2 py-1 text-[11px] font-semibold text-gray">
                                        🌿 Balcony
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray">
                                    {room.description}
                                  </p>

                                  {/* Book CTA, always visible, pinned to card bottom */}
                                  <button
                                    onClick={() => handleRoomSelect(room.id)}
                                    disabled={loadingAvailability}
                                    className={clsx(
                                      "mt-5 flex w-full items-center justify-center gap-2 rounded-[5px] px-6 py-3 text-sm font-semibold transition-all duration-200",
                                      loadingAvailability
                                        ? "cursor-not-allowed bg-[#F5F5F5] text-gray"
                                        : "bg-black text-white hover:opacity-80",
                                    )}
                                  >
                                    {loadingAvailability ? (
                                      <>
                                        <Loader2 size={14} className="animate-spin" /> Checking…
                                      </>
                                    ) : (
                                      <>
                                        Book this room <ArrowRight size={14} />
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state, prominent, action-oriented */}
              {!loadingAvailability && totalRooms === 0 && (
                <div className="mt-10 rounded-[5px] bg-white p-8 text-center shadow-sm sm:p-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink/20 text-black">
                    <Search size={22} />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight">
                    Nothing matches <span className="italic font-light">these filters</span>
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray">
                    Your chosen combination is unusually specific. Try a nearby move-in date or
                    a different city, coliving availability changes weekly.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (stayType === "LONG") {
                          setMoveInDate(null);
                        } else {
                          setCheckIn(null);
                          setCheckOut(null);
                        }
                        setShowResults(false);
                      }}
                      className="rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-80"
                    >
                      Try a different date
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCity("");
                        setMoveInDate(null);
                        setShowResults(false);
                      }}
                      className="rounded-[5px] bg-white px-6 py-3 text-sm font-semibold text-black ring-1 ring-lightgray hover:bg-[#F5F5F5]"
                    >
                      Pick another city
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Collapsed room bar (visible during checkout + lease) ── */}
        {roomCollapsed && selectedRoom && selectedLocation && (
          <div className="border-b border-[#E8E6E0] bg-white pt-20 pb-4 sm:pt-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between rounded-[5px] bg-[#F5F5F5] px-5 py-3">
                <p className="text-sm">
                  <span className="font-bold">{selectedRoom.name}</span>
                  <span className="text-gray"> · STACEY {selectedLocation.name} · {(() => {
                    if (stayType === "SHORT") {
                      const price = getNightlyPrice(selectedRoom.name, selectedLocation.slug);
                      if (price) return `€${price}/night`;
                    }
                    return `€${selectedRoom.priceMonthly}/mo`;
                  })()}</span>
                </p>
                <button onClick={editRoom} className="flex items-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
                  <Pencil size={11} /> Change room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CHECKOUT: Two-column layout (form left, booking card right) ── */}
        {roomCollapsed && selectedRoom && selectedLocation && !showLease && (
          <section className="bg-[#FAFAFA] py-16">
            <div ref={aboutRef} className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="lg:grid lg:grid-cols-3 lg:gap-10">
                  {/* Left: Form (2/3) */}
                  <div className="lg:col-span-2">
                      <StepAboutYou
                        stayType={stayType!}
                        firstName={firstName} setFirstName={setFirstName}
                        lastName={lastName} setLastName={setLastName}
                        email={email} setEmail={setEmail}
                        phone={phone} setPhone={setPhone}
                        moveInReason={moveInReason} setMoveInReason={setMoveInReason}
                        message={message} setMessage={setMessage}
                        dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
                        street={street} setStreet={setStreet}
                        zipCode={zipCode} setZipCode={setZipCode}
                        addressCity={addressCity} setAddressCity={setAddressCity}
                        country={country} setCountry={setCountry}
                      />
                  </div>

                  {/* Right: Sticky booking card (1/3) */}
                  <div className="mt-6 lg:mt-0">
                    <div className="lg:sticky lg:top-24">
                      <div className="rounded-[5px] bg-black p-6 text-white">
                        {/* Room image */}
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[5px]">
                          <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="400px" />
                          {selectedRoom.forCouples && (
                            <span className="absolute right-2 top-2 rounded-[5px] bg-pink px-2 py-0.5 text-[10px] font-bold text-white">Couples</span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="mt-4">
                          <p className="text-lg font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                          <p className="mt-1 text-sm text-white/60">
                            {persons} {persons === 1 ? "person" : "persons"} ·{" "}
                            {moveInDate ? `from ${formatDate(moveInDate)}` : checkIn && checkOut ? `${formatDate(checkIn)}, ${formatDate(checkOut)} · ${nightCount} nights` : ""}
                          </p>
                          {selectedRoom.sizeSqm && <p className="mt-0.5 text-sm text-white/40">{selectedRoom.sizeSqm} m²</p>}
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-4">
                          {(() => {
                            if (stayType === "SHORT" && selectedLocation) {
                              const pricing = selectedRoomPricing;
                              if (pricing) {
                                return (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-white/60">
                                      <span>€{pricing.perNight} × {nightCount} nights</span>
                                      <span>€{pricing.totalGross.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-white/40 text-xs">
                                      <span>incl. {pricing.vatPercent}% VAT</span>
                                      <span>€{pricing.vatAmount.toFixed(2)}</span>
                                    </div>
                                    {pricing.cityTaxTotal > 0 && (
                                      <div className="flex justify-between text-white/60">
                                        <span>City tax</span>
                                        <span>€{pricing.cityTaxTotal.toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-base">
                                      <span>Total</span>
                                      <span>€{pricing.grandTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              if (pricingLoading) {
                                return (
                                  <div className="space-y-2">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                                    <div className="mt-2 h-5 w-full animate-pulse rounded bg-white/10" />
                                  </div>
                                );
                              }
                              // Pricing fetch finished but returned no data (apaleo has no offers
                              // for this date range). Tell the user instead of leaving them with
                              // a stuck skeleton.
                              return (
                                <p className="text-sm text-white/60">
                                  Pricing not available for these dates. Please try other dates.
                                </p>
                              );
                            }
                            const rent = selectedRoom.priceMonthly + (persons === 2 ? 50 : 0);
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-white/60">Monthly rent</p>
                                  <p className="text-2xl font-extrabold">€{rent}<span className="text-sm font-normal text-white/60">/mo</span></p>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm text-white/60">
                                  <p>Security deposit</p>
                                  <p>€{rent * 2} <span className="text-xs">(2× rent)</span></p>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                                  <div>
                                    <p className="text-sm text-white/80 font-semibold">Due now · Booking fee</p>
                                    <span className="mt-1 inline-block rounded-[3px] bg-pink/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink">
                                      Non-refundable
                                    </span>
                                  </div>
                                  <p className="text-base font-bold text-pink">€195</p>
                                </div>
                                {/* Explicit non-refundable terms, users need to see this
                                    before hitting the payment button so there are no
                                    surprises if the deposit isn't paid in time or they
                                    move in and expect a credit. */}
                                <p className="mt-3 text-[11px] leading-relaxed text-white/50">
                                  The €195 booking fee is charged today to secure your
                                  room and is <strong className="text-white/80">non-refundable</strong>, including
                                  if the €{rent * 2} deposit isn&apos;t paid within 48h and the
                                  reservation expires, or once you&apos;ve moved in.
                                  It is not credited against your rent.
                                </p>
                                <p className="mt-2 text-[11px] text-white/40">
                                  Deposit (€{rent * 2}) comes next, separate payment link within 48h.
                                </p>
                              </>
                            );
                          })()}
                        </div>

                        {/* Required acknowledgment, different checkbox copy
                            per stay type:
                            • SHORT: T&C + Privacy Policy (consumer booking,
                              no individual contract beyond the booking).
                            • LONG: Non-refundable booking fee (the lease
                              itself covers T&C / privacy, so no need to
                              duplicate, but the €195 fee is outside the
                              lease and needs its own explicit ack). */}
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[5px] border border-white/10 p-4 transition-colors hover:border-white/20">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] accent-pink"
                          />
                          <span className="text-sm leading-relaxed text-white/60">
                            {stayType === "LONG" ? (
                              <>
                                I understand that the €195 booking fee is{" "}
                                <strong className="text-white">non-refundable</strong>,
                                including if the deposit isn&apos;t paid within 48h or
                                once I&apos;ve moved in.
                              </>
                            ) : (
                              <>
                                I agree to the{" "}
                                <span className="font-medium text-white underline">Terms &amp; Conditions</span> and{" "}
                                <span className="font-medium text-white underline">Privacy Policy</span>.
                              </>
                            )}
                          </span>
                        </label>

                        {/* CTA */}
                        <button
                          onClick={handleSubmit}
                          disabled={!isAboutComplete || !termsAccepted || submitting}
                          className={clsx(
                            "mt-4 flex w-full items-center justify-center gap-2 rounded-[5px] py-3.5 text-base font-bold transition-all duration-200",
                            isAboutComplete && termsAccepted && !submitting
                              ? "bg-pink text-black hover:opacity-80"
                              : "cursor-not-allowed bg-white/10 text-white/30"
                          )}
                        >
                          {submitting ? (
                            <><Loader2 size={14} className="animate-spin" /> {stayType === "SHORT" ? "Redirecting to payment..." : "Generating..."}</>
                          ) : stayType === "LONG" ? (
                            <>Next <ArrowRight size={14} /></>
                          ) : (
                            <>Continue to payment <ArrowRight size={14} /></>
                          )}
                        </button>
                      </div>

                      {/* Change room link */}
                      <button onClick={editRoom} className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-gray transition-colors hover:text-black">
                        <Pencil size={11} /> Change room
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ── LEASE SIGNING (LONG stay only) ── */}
        {showLease && selectedRoom && selectedLocation && (
          <section className="bg-white py-16">
            <div ref={leaseRef} className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="lg:grid lg:grid-cols-3 lg:gap-10">
                  {/* Left: Signing widget (2/3) */}
                  <div className="lg:col-span-2">
                    <StepLease
                      signingUrl={signingUrl}
                      signatureRequestId={signatureRequestId}
                      devMode={leaseDevMode}
                      onSigned={handleLeaseSigned}
                    />
                  </div>

                  {/* Right: Booking summary (1/3) */}
                  <div className="mt-10 lg:mt-0">
                    <div className="lg:sticky lg:top-24">
                      <div className="rounded-[5px] bg-black p-6 text-white">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[5px]">
                          <Image src={selectedRoom.image} alt={selectedRoom.name} fill className="object-cover" sizes="400px" />
                        </div>
                        <div className="mt-4">
                          <p className="text-lg font-bold">{selectedLocation.name} · {selectedRoom.name}</p>
                          <p className="mt-1 text-sm text-white/60">
                            {persons} {persons === 1 ? "person" : "persons"} · from {formatDate(moveInDate!)}
                          </p>
                        </div>
                        <div className="mt-4 border-t border-white/10 pt-4">
                          {(() => {
                            if (stayType === "SHORT" && selectedLocation) {
                              const price = getNightlyPrice(selectedRoom.name, selectedLocation.slug);
                              return (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-white/60">Per night</p>
                                  <p className="text-2xl font-extrabold">€{price}<span className="text-sm font-normal text-white/60">/night</span></p>
                                </div>
                              );
                            }
                            const rent = selectedRoom.priceMonthly + (persons === 2 ? 50 : 0);
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-white/60">Monthly rent</p>
                                  <p className="text-2xl font-extrabold">€{rent}<span className="text-sm font-normal text-white/60">/mo</span></p>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm text-white/60">
                                  <p>Security deposit</p>
                                  <p>€{rent * 2} <span className="text-xs">(2× rent)</span></p>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white/80">Booking fee · due after signing</p>
                                    <span className="mt-1 inline-block rounded-[3px] bg-pink/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink">
                                      Non-refundable
                                    </span>
                                  </div>
                                  <p className="text-base font-bold text-pink">€195</p>
                                </div>
                                <p className="mt-2 text-[11px] text-white/40">
                                  After you sign, we&apos;ll redirect you to pay the €195 fee.
                                  The €{rent * 2} deposit comes within 48h via a separate email link.
                                </p>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tenant</p>
                          <p className="text-sm">{firstName} {lastName}</p>
                          <p className="text-xs text-white/60">{email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )}
      </main>

      {/* ── Bruno floating widget ── */}
      {!submitted && <BrunoWidget />}

      {!submitted && <Footer />}
    </>
  );
}

