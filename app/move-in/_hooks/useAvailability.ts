"use client";

import { useCallback, useEffect, useState } from "react";
import { locations, type Location, type StayType } from "@/lib/data";

// Shape returned by /api/availability for one category at one location.
export type CategoryAvailability = {
  available: number;
  total: number;
  moveInDates?: string[];
  pricePerNight?: number | null;
  totalGross?: number | null;
  vatAmount?: number | null;
  vatPercent?: number | null;
  cityTaxTotal?: number | null;
  grandTotal?: number | null;
};

// Map of locationSlug → category → availability data.
export type AvailabilityMap = Record<string, Record<string, CategoryAvailability>>;

type Params = {
  stayType: StayType | null;
  persons: 1 | 2;
  city: string;
  checkIn: string | null;
  checkOut: string | null;
  showResults: boolean;
};

type Result = {
  availability: AvailabilityMap;
  loadingAvailability: boolean;
  basePrices: Record<string, Record<string, number>>;
};

/**
 * useAvailability — owns all availability/pricing fetches for the move-in flow.
 *
 * - basePrices: fetched once on mount (always 1-person; used as fallback before
 *   live data lands).
 * - availability: refetched whenever stayType / persons / city / dates change.
 *   SHORT stay fetches once `showResults` is true and dates are set.
 *   LONG stay fetches as soon as a city is selected.
 *
 * Both fetches retry once on 5xx to ride out Vercel cold starts and transient
 * Supabase pool issues that would otherwise leave the UI empty.
 */
export function useAvailability({
  stayType,
  persons,
  city,
  checkIn,
  checkOut,
  showResults,
}: Params): Result {
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [basePrices, setBasePrices] = useState<Record<string, Record<string, number>>>({});

  // Base nightly prices from apaleo (fetched once on mount).
  useEffect(() => {
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.ok) setBasePrices(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchAvailability = useCallback(
    (locs: Location[], opts?: { ci?: string; co?: string }) => {
      setLoadingAvailability(true);
      const fetchOnce = async (url: string) => {
        const res = await fetch(url);
        if (res.ok) {
          const body = await res.json();
          return body?.ok ? body.data : null;
        }
        if (res.status >= 500) throw new Error(`retry ${res.status}`);
        return null;
      };
      const fetches = locs.map(async (loc) => {
        const params = new URLSearchParams({ location: loc.slug, persons: String(persons) });
        if (loc.stayType === "SHORT" && opts?.ci && opts?.co) {
          params.set("checkIn", opts.ci);
          params.set("checkOut", opts.co);
        }
        const url = `/api/availability?${params}`;
        try {
          return { slug: loc.slug, stayType: loc.stayType, data: await fetchOnce(url) };
        } catch {
          // Retry once after a short delay
          await new Promise((r) => setTimeout(r, 600));
          try {
            return { slug: loc.slug, stayType: loc.stayType, data: await fetchOnce(url) };
          } catch {
            return { slug: loc.slug, stayType: loc.stayType, data: null };
          }
        }
      });

      Promise.all(fetches).then((results) => {
        const map: AvailabilityMap = {};
        results.forEach(({ slug, stayType: locStayType, data }) => {
          if (!data?.categories) {
            // SHORT failure → insert empty entry so the display shows "Sold out" instead
            // of falling back to 1-person basePrices.
            // LONG failure → leave the slot empty so the next fetch (e.g. on city change)
            // can retry without a stale empty cache hiding the move-in date dropdown.
            if (locStayType === "SHORT") map[slug] = {};
            return;
          }
          const catMap: Record<string, CategoryAvailability> = {};
          for (const cat of data.categories) {
            catMap[cat.category] = {
              available: cat.available ?? cat.freeNow ?? 0,
              total: cat.total,
              moveInDates: cat.moveInDates,
              pricePerNight: cat.pricePerNight ?? null,
              totalGross: cat.totalGross ?? null,
              vatAmount: cat.vatAmount ?? null,
              vatPercent: cat.vatPercent ?? null,
              cityTaxTotal: cat.cityTaxTotal ?? null,
              grandTotal: cat.grandTotal ?? null,
            };
          }
          map[slug] = catMap;
        });
        setAvailability(map);
        setLoadingAvailability(false);
      });
    },
    [persons],
  );

  // SHORT stay: fetch when search results are shown
  useEffect(() => {
    if (stayType !== "SHORT" || !showResults || !checkIn || !checkOut) return;
    const locs = locations.filter((l) => l.stayType === "SHORT");
    fetchAvailability(locs, { ci: checkIn, co: checkOut });
  }, [stayType, persons, checkIn, checkOut, showResults, fetchAvailability]);

  // LONG stay: fetch as soon as city is selected (before showResults)
  useEffect(() => {
    if (stayType !== "LONG" || !city) return;
    const locs = locations.filter((l) => l.stayType === "LONG" && l.city === city);
    if (locs.length > 0) fetchAvailability(locs);
  }, [stayType, persons, city, fetchAvailability]);

  return { availability, loadingAvailability, basePrices };
}
