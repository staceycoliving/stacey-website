"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { locations } from "@/lib/data";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic3RhY2V5MjAxOSIsImEiOiJjazFxZHo2bGMwMjFkM2RzeHNlNjd4NjR3In0.BADipEjIKFaTMjt3dX6F-w";

// Coordinates live on each Location in lib/data.ts (loc.coords) so this
// map + the location-detail map + any future map surface share one
// source of truth.
const cityFallback: Record<string, { center: [number, number]; zoom: number }> = {
  hamburg: { center: [9.98, 53.565], zoom: 12 },
  berlin: { center: [13.405, 52.511], zoom: 13 },
  vallendar: { center: [7.619, 50.396], zoom: 14 },
};

type CityFilter = "all" | "hamburg" | "berlin" | "vallendar";
type MarkerVariant = "number" | "photo" | "expand";

export default function LocationMap({
  cityFilter = "all",
  activeSlug = null,
  onSelect,
  numbers = {},
  markerVariant = "number",
}: {
  cityFilter?: CityFilter;
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  /** Optional slug → display number map for the marker labels. Used
   *  when `markerVariant === "number"`. */
  numbers?: Record<string, number>;
  /** "number", black circle with digit (default).
   *  "photo" , small rounded-[5px] thumbnail of the location image.
   *  "expand", small black "S" dot that expands into a photo+name
   *             pill on hover (Airbnb-style). */
  markerVariant?: MarkerVariant;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  // Per-slug refs to the marker root elements so we can update their
  // styling in response to activeSlug / cityFilter without recreating.
  const markerEls = useRef<Record<string, HTMLDivElement>>({});
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Mount the map once + create one marker per location. Markers stay
  // alive across filter changes; only their styling is updated below.
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=" + mapboxgl.accessToken,
      center: cityFallback.hamburg.center,
      zoom: cityFallback.hamburg.zoom,
      attributionControl: false,
    });
    // Default Mapbox NavigationControl looks utilitarian and clashes
    // with the premium pill+map composition. Discovery on the homepage
    // doesn't need manual zoom, fitBounds + flyTo do the work.

    locations.forEach((loc) => {
      if (!loc.coords) return;
      const el = document.createElement("div");
      el.className = "stacey-marker";
      el.style.cssText = "cursor:pointer;will-change:transform";

      if (markerVariant === "photo") {
        // Square photo thumbnail with white border. Active state adds
        // pink ring + scale via the active effect below.
        el.innerHTML = `
          <div class="stacey-marker__inner" style="
            position:relative;
            width:48px;height:48px;
            border-radius:5px;
            overflow:hidden;
            border:2px solid white;
            box-shadow:0 4px 14px rgba(0,0,0,0.35);
            background:#1A1A1A;
            transition:all 0.25s ease;
          ">
            <span class="stacey-marker__pulse" style="
              position:absolute;inset:-4px;border-radius:8px;
              background:transparent;opacity:0;pointer-events:none;
            "></span>
            <img class="stacey-marker__photo" src="${loc.images[0]}" alt="" style="
              width:100%;height:100%;object-fit:cover;display:block;
              pointer-events:none;
            " />
          </div>`;
      } else if (markerVariant === "expand") {
        // Small dot that morphs into a photo + name badge on hover.
        // Pink for LONG, black for SHORT, same color logic as the
        // SHORT/LONG badges in the side-panel list and on the cards.
        const bg = loc.stayType === "SHORT" ? "#1A1A1A" : "#FCB0C0";
        const txt = loc.stayType === "SHORT" ? "white" : "#1A1A1A";
        el.innerHTML = `
          <div class="stacey-marker__inner stacey-marker--expand" style="
            position:relative;
            display:flex;align-items:center;
            background:${bg};
            padding:3px;
            border-radius:5px;
            border:2px solid white;
            box-shadow:0 2px 10px rgba(0,0,0,0.35);
            transition:all 0.3s ease;
          ">
            <span class="stacey-marker__photo" style="
              width:22px;height:22px;border-radius:3px;
              background-image:url('${loc.images[0]}');
              background-size:cover;background-position:center;
              transition:all 0.3s ease;flex-shrink:0;
              border:1px solid rgba(0,0,0,0.15);
            "></span>
            <span class="stacey-marker__name" style="
              color:${txt};font-weight:700;font-size:12px;
              font-family:Montserrat,sans-serif;
              white-space:nowrap;
              max-width:0;overflow:hidden;
              padding-left:0;padding-right:0;
              transition:all 0.3s ease;
            ">${loc.name}</span>
          </div>`;
      } else {
        // "number", original numbered/S badge.
        el.innerHTML = `
          <div class="stacey-marker__inner" style="
            position:relative;
            width:32px;height:32px;
            background:#1A1A1A;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            border:2px solid white;
            transition:all 0.25s ease;
          ">
            <span class="stacey-marker__pulse" style="
              position:absolute;inset:0;border-radius:50%;
              background:#FCB0C0;opacity:0;pointer-events:none;
            "></span>
            <span class="stacey-marker__label" style="
              position:relative;
              color:white;font-weight:900;font-size:14px;
              font-family:Montserrat,sans-serif;
              line-height:1;
            ">S</span>
          </div>`;
      }

      // Hover-capable devices (desktop): hover = preview, click = navigate.
      // Touch devices: tap = select on map (carousel syncs); user navigates
      // by tapping the corresponding card. This avoids the iOS "first tap
      // is hover, second tap is click" awkwardness.
      const hoverCapable =
        typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
      if (hoverCapable) {
        el.addEventListener("mouseenter", () => onSelect?.(loc.slug));
        el.addEventListener("mouseleave", () => onSelect?.(null));
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          window.location.href = `/locations/${loc.slug}`;
        });
      } else {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect?.(loc.slug);
        });
      }

      markerEls.current[loc.slug] = el;
      const m = new mapboxgl.Marker({ element: el }).setLngLat(loc.coords).addTo(map.current!);
      markersRef.current.push(m);
    });

    return () => {
      map.current?.remove();
      map.current = null;
      markersRef.current = [];
      markerEls.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker labels whenever the numbering changes (e.g. user
  // switches city tab → numbers reset to that city's slice).
  useEffect(() => {
    Object.entries(markerEls.current).forEach(([slug, el]) => {
      const label = el.querySelector<HTMLElement>(".stacey-marker__label");
      if (!label) return;
      label.textContent = numbers[slug] != null ? String(numbers[slug]) : "S";
    });
  }, [numbers]);

  // City filter, pan/zoom the map to fit the filtered set, dim markers
  // outside the filter so the user's eye lands on what's selected.
  useEffect(() => {
    if (!map.current) return;

    const filtered = cityFilter === "all" ? locations : locations.filter((l) => l.city === cityFilter);
    const coordsList = filtered
      .map((l) => l.coords)
      .filter((c): c is [number, number] => Boolean(c));

    if (coordsList.length >= 2) {
      const bounds = coordsList.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coordsList[0], coordsList[0]),
      );
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 40, right: 40 },
        duration: 900,
        maxZoom: 13,
      });
    } else if (coordsList.length === 1) {
      const fallback = cityFilter !== "all" ? cityFallback[cityFilter] : null;
      if (fallback) {
        map.current.flyTo({ center: fallback.center, zoom: fallback.zoom, duration: 900 });
      } else {
        map.current.flyTo({ center: coordsList[0], zoom: 13, duration: 900 });
      }
    }

    // Dim markers outside the filter.
    locations.forEach((loc) => {
      const el = markerEls.current[loc.slug];
      if (!el) return;
      const dimmed = cityFilter !== "all" && loc.city !== cityFilter;
      el.style.opacity = dimmed ? "0.25" : "1";
      el.style.pointerEvents = dimmed ? "none" : "";
    });
  }, [cityFilter]);

  // Active marker, fly to it + apply variant-specific active state.
  // Other markers calm down. When activeSlug becomes null, the calm
  // state stays so the map doesn't snap back unexpectedly.
  useEffect(() => {
    Object.entries(markerEls.current).forEach(([slug, el]) => {
      const inner = el.querySelector<HTMLElement>(".stacey-marker__inner");
      if (!inner) return;
      const pulse = el.querySelector<HTMLElement>(".stacey-marker__pulse");
      const isActive = slug === activeSlug;
      inner.style.zIndex = isActive ? "10" : "auto";

      if (markerVariant === "photo") {
        // Outer pink ring via box-shadow, scale up.
        inner.style.transform = isActive ? "scale(1.18)" : "scale(1)";
        inner.style.borderColor = isActive ? "#FCB0C0" : "white";
        inner.style.boxShadow = isActive
          ? "0 0 0 4px rgba(252,176,192,0.55), 0 6px 20px rgba(0,0,0,0.45)"
          : "0 4px 14px rgba(0,0,0,0.35)";
        if (pulse) {
          pulse.style.background = "#FCB0C0";
          pulse.style.opacity = isActive ? "0.4" : "0";
          pulse.style.animation = isActive
            ? "stacey-marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
            : "none";
        }
      } else if (markerVariant === "expand") {
        // Photo grows + name slides in. Active state adds a glow ring
        // in the badge's own color (pink for LONG, black for SHORT)
        // so the highlight reads consistent with the badge's identity.
        const loc = locations.find((l) => l.slug === slug);
        const isLong = loc?.stayType !== "SHORT";
        const photo = el.querySelector<HTMLElement>(".stacey-marker__photo");
        const name = el.querySelector<HTMLElement>(".stacey-marker__name");
        inner.style.transform = isActive ? "scale(1.05)" : "scale(1)";
        inner.style.boxShadow = isActive
          ? isLong
            ? "0 0 0 4px rgba(252,176,192,0.55), 0 6px 18px rgba(0,0,0,0.4)"
            : "0 0 0 4px rgba(26,26,26,0.55), 0 6px 18px rgba(0,0,0,0.5)"
          : "0 2px 10px rgba(0,0,0,0.35)";
        if (photo) {
          photo.style.width = isActive ? "30px" : "22px";
          photo.style.height = isActive ? "30px" : "22px";
        }
        if (name) {
          name.style.maxWidth = isActive ? "200px" : "0";
          name.style.paddingLeft = isActive ? "10px" : "0";
          name.style.paddingRight = isActive ? "6px" : "0";
        }
      } else {
        // "number", original behaviour
        inner.style.background = isActive ? "#FCB0C0" : "#1A1A1A";
        inner.style.transform = isActive ? "scale(1.25)" : "scale(1)";
        if (pulse) {
          pulse.style.opacity = isActive ? "0.5" : "0";
          pulse.style.animation = isActive
            ? "stacey-marker-ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
            : "none";
        }
      }
    });

    if (!map.current || !activeSlug) return;
    const loc = locations.find((l) => l.slug === activeSlug);
    if (!loc?.coords) return;
    map.current.flyTo({
      center: loc.coords,
      zoom: 14,
      duration: 700,
      essential: true,
    });
  }, [activeSlug, markerVariant]);

  return (
    <div
      ref={mapContainer}
      className="h-[420px] w-full overflow-hidden rounded-[5px] sm:h-[600px]"
    />
  );
}
