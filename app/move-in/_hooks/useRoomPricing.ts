"use client";

import { useEffect, useState } from "react";
import { ROOM_NAME_TO_CATEGORY, type StayType } from "@/lib/data";
import type { AvailabilityMap } from "./useAvailability";

export type PricingState = {
  totalGross: number;
  netAmount: number;
  vatAmount: number;
  vatPercent: number;
  cityTaxTotal: number;
  grandTotal: number;
  perNight: number;
} | null;

type Params = {
  stayType: StayType | null;
  locSlug: string | null;
  roomName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  persons: 1 | 2;
  availability: AvailabilityMap;
};

type Result = {
  selectedRoomPricing: PricingState;
  pricingLoading: boolean;
};

/**
 * useRoomPricing — fetches per-room SHORT-stay pricing once a room is selected.
 *
 * Reuses pricing already cached in `availability` (from the search-results
 * fetch in useAvailability) when present; only hits /api/availability again if
 * the cached entry is missing grandTotal (e.g. user opened a room before the
 * persons-aware availability fetch landed).
 *
 * No-op for LONG stay or until a room + dates are picked.
 */
export function useRoomPricing({
  stayType,
  locSlug,
  roomName,
  checkIn,
  checkOut,
  persons,
  availability,
}: Params): Result {
  const [selectedRoomPricing, setSelectedRoomPricing] = useState<PricingState>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  useEffect(() => {
    if (stayType !== "SHORT" || !locSlug || !roomName || !checkIn || !checkOut) {
      setSelectedRoomPricing(null);
      setPricingLoading(false);
      return;
    }
    const cat = ROOM_NAME_TO_CATEGORY[roomName];
    if (!cat) return;

    // Already have pricing from availability state?
    const existing = availability[locSlug]?.[cat];
    if (existing?.grandTotal) {
      setSelectedRoomPricing({
        totalGross: existing.totalGross!,
        netAmount: existing.vatAmount ? existing.totalGross! - existing.vatAmount! : existing.totalGross!,
        vatAmount: existing.vatAmount!,
        vatPercent: existing.vatPercent!,
        cityTaxTotal: existing.cityTaxTotal!,
        grandTotal: existing.grandTotal!,
        perNight: existing.pricePerNight!,
      });
      setPricingLoading(false);
      return;
    }

    // Fetch from API
    let cancelled = false;
    setPricingLoading(true);
    setSelectedRoomPricing(null);
    fetch(`/api/availability?location=${locSlug}&checkIn=${checkIn}&checkOut=${checkOut}&persons=${persons}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (cancelled) return;
        const data = body?.ok ? body.data : null;
        const found = data?.categories?.find((c: { category: string }) => c.category === cat);
        if (found?.grandTotal) {
          setSelectedRoomPricing({
            totalGross: found.totalGross,
            netAmount: found.netAmount,
            vatAmount: found.vatAmount,
            vatPercent: found.vatPercent,
            cityTaxTotal: found.cityTaxTotal,
            grandTotal: found.grandTotal,
            perNight: found.pricePerNight,
          });
        }
        setPricingLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Pricing fetch failed:", err);
        setPricingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stayType, locSlug, roomName, checkIn, checkOut, persons, availability]);

  return { selectedRoomPricing, pricingLoading };
}
