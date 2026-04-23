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
 * useRoomPricing — derives SHORT-stay pricing for the currently selected
 * room from the shared `availability` map.
 *
 * Single source of truth: useAvailability already fetches /api/availability
 * for all SHORT locations when the user enters the results view (with
 * retry-once on 5xx). This hook just picks the relevant category out and
 * translates it into the pricing shape the booking card renders. No extra
 * fetch, so there's no race between two parallel callers.
 *
 * Loading = availability hasn't landed yet for this location.
 * Null pricing = availability landed but no bookable offer for these dates.
 */
export function useRoomPricing({
  stayType,
  locSlug,
  roomName,
  checkIn,
  checkOut,
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

    // Availability hasn't landed for this location yet — show a skeleton
    // while useAvailability's background fetch is still in flight.
    const locEntry = availability[locSlug];
    if (!locEntry) {
      setSelectedRoomPricing(null);
      setPricingLoading(true);
      return;
    }

    const existing = locEntry[cat];
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

    // Availability landed but apaleo has no offer for these dates on this
    // category (fully booked or closed-on-arrival). Let the card tell the
    // user instead of showing a stuck skeleton.
    setSelectedRoomPricing(null);
    setPricingLoading(false);
  }, [stayType, locSlug, roomName, checkIn, checkOut, availability]);

  return { selectedRoomPricing, pricingLoading };
}
