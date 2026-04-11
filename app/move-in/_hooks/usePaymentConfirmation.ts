"use client";

import { useEffect, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import {
  locations,
  getRoomById,
  getLocationByRoomId,
  ROOM_NAME_TO_CATEGORY,
  type StayType,
} from "@/lib/data";

/**
 * Setters that the hook needs to write into. Pass them as a bundle so the
 * hook can mutate the page's form state without becoming a callback maze.
 *
 * Only the fields written by the URL/Stripe-redirect logic are listed here —
 * if a state field never gets touched by this effect, don't add it.
 */
export type MoveInStateSetters = {
  setStayType: (v: StayType | null) => void;
  setPersons: (v: 1 | 2) => void;
  setCity: (v: string) => void;
  setCheckIn: (v: string | null) => void;
  setCheckOut: (v: string | null) => void;
  setMoveInDate: (v: string | null) => void;
  setShowResults: (v: boolean) => void;
  setSelectedRoomId: (v: string | null) => void;
  setRoomCollapsed: (v: boolean) => void;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;
  setPhone: (v: string) => void;
  setDateOfBirth: (v: string) => void;
  setStreet: (v: string) => void;
  setZipCode: (v: string) => void;
  setAddressCity: (v: string) => void;
  setCountry: (v: string) => void;
  setMoveInReason: (v: string) => void;
  setMessage: (v: string) => void;
  setTermsAccepted: (v: boolean) => void;
  setSubmitted: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
};

type Result = {
  confirmingPayment: boolean;
  confirmError: string | null;
};

/**
 * usePaymentConfirmation — handles three URL-driven entry points to /move-in:
 *
 *   1. Fresh visit (no params) → reset every form field exactly once.
 *   2. Stripe redirect (?payment=success) → confirm via /api/booking (LONG)
 *      or /api/checkout/short/confirm (SHORT), then jump straight to the
 *      submitted-confirmation view.
 *   3. Direct room link (?room=...) → prefill stayType/city/room/dates so the
 *      user lands on the booking step for a specific room.
 *
 * Owns its own refs so React StrictMode double-mounts can't double-fire the
 * reset or replay the Stripe confirm.
 */
export function usePaymentConfirmation(
  searchParams: ReadonlyURLSearchParams,
  setters: MoveInStateSetters,
): Result {
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const paymentProcessedRef = useRef(false);
  const initialResetDoneRef = useRef(false);

  useEffect(() => {
    const paramRoom = searchParams.get("room");
    const paramDate = searchParams.get("date");
    const paramCheckIn = searchParams.get("checkin");
    const paramCheckOut = searchParams.get("checkout");
    const paramPersons = searchParams.get("persons");
    const paymentStatus = searchParams.get("payment");

    // No URL params → fresh visit, reset everything (only on initial mount)
    if (!paramRoom && !paymentStatus && !paymentProcessedRef.current && !initialResetDoneRef.current) {
      initialResetDoneRef.current = true;
      setters.setStayType(null);
      setters.setPersons(1);
      setters.setCity("");
      setters.setCheckIn(null);
      setters.setCheckOut(null);
      setters.setMoveInDate(null);
      setters.setShowResults(false);
      setters.setSelectedRoomId(null);
      setters.setRoomCollapsed(false);
      setters.setFirstName("");
      setters.setLastName("");
      setters.setEmail("");
      setters.setPhone("");
      setters.setDateOfBirth("");
      setters.setStreet("");
      setters.setZipCode("");
      setters.setAddressCity("");
      setters.setCountry("");
      setters.setMoveInReason("");
      setters.setMessage("");
      setters.setTermsAccepted(false);
      setters.setSubmitted(false);
      setters.setSubmitting(false);
      return;
    }

    // Handle Stripe redirect
    const sessionId = searchParams.get("session_id");
    const bookingId = searchParams.get("booking_id");
    if (paymentStatus === "success") {
      paymentProcessedRef.current = true;
      setConfirmingPayment(true);
      setConfirmError(null);

      if (bookingId) {
        // LONG Stay: Booking fee paid → fetch booking data and show confirmation
        fetch(`/api/booking?id=${bookingId}`)
          .then(async (r) => {
            const body = await r.json();
            if (!body?.ok) throw new Error(body?.error?.message || "Failed to load booking");
            return body.data;
          })
          .then((data) => {
            setters.setStayType("LONG");
            setters.setFirstName(data.firstName || "");
            setters.setPersons(data.persons || 1);
            setters.setMoveInDate(data.moveInDate || "");
            const loc = locations.find((l) => l.slug === data.location);
            if (loc) {
              setters.setCity(loc.city);
              const room = loc.rooms.find((r) => ROOM_NAME_TO_CATEGORY[r.name] === data.category);
              if (room) setters.setSelectedRoomId(room.id);
            }
            setters.setSubmitted(true);
            setConfirmingPayment(false);
            window.history.replaceState({}, "", "/move-in");
          })
          .catch((err) => {
            console.error("Booking load error:", err);
            // Still show confirmation even if fetch fails
            setters.setStayType("LONG");
            setters.setSubmitted(true);
            setConfirmingPayment(false);
            window.history.replaceState({}, "", "/move-in");
          });
      } else if (sessionId) {
        // SHORT Stay: confirm via apaleo
        fetch("/api/checkout/short/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
          .then(async (r) => {
            const body = await r.json();
            if (!body?.ok) throw new Error(body?.error?.message || `Confirm failed (${r.status})`);
            return body.data;
          })
          .then((data) => {
            setters.setStayType("SHORT");
            setters.setFirstName(data.firstName || "");
            setters.setPersons(data.persons || 1);
            setters.setCheckIn(data.checkIn || null);
            setters.setCheckOut(data.checkOut || null);
            const loc = locations.find((l) => l.slug === data.slug);
            if (loc) {
              setters.setCity(loc.city);
              const room = loc.rooms.find((r) => ROOM_NAME_TO_CATEGORY[r.name] === data.category);
              if (room) setters.setSelectedRoomId(room.id);
            }
            setters.setSubmitted(true);
            setConfirmingPayment(false);
            window.history.replaceState({}, "", "/move-in");
          })
          .catch((err) => {
            console.error("Booking confirm error:", err);
            setConfirmError(String(err));
            window.history.replaceState({}, "", "/move-in");
            setConfirmingPayment(false);
          });
      } else {
        setConfirmError("No session ID or booking ID in URL");
        setConfirmingPayment(false);
      }
      return;
    }

    if (paramRoom) {
      const foundRoom = getRoomById(paramRoom);
      const foundLoc = getLocationByRoomId(paramRoom);
      if (foundRoom && foundLoc) {
        setters.setStayType(foundLoc.stayType);
        setters.setPersons(paramPersons === "2" ? 2 : 1);
        setters.setCity(foundLoc.city);
        setters.setSelectedRoomId(paramRoom);

        if (paramCheckIn && paramCheckOut) {
          setters.setCheckIn(paramCheckIn);
          setters.setCheckOut(paramCheckOut);
        } else if (paramDate) {
          setters.setMoveInDate(paramDate);
        }

        setters.setShowResults(true);
        setters.setRoomCollapsed(true);
      }
    }
    // Effect fires once per navigation; setters bundle is intentionally not in deps
    // (would re-run on every render and re-trigger the reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return { confirmingPayment, confirmError };
}
