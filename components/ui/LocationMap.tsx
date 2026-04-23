"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { locations } from "@/lib/data";

mapboxgl.accessToken = "pk.eyJ1Ijoic3RhY2V5MjAxOSIsImEiOiJjazFxZHo2bGMwMjFkM2RzeHNlNjd4NjR3In0.BADipEjIKFaTMjt3dX6F-w";

// Coordinates now live on each Location in lib/data.ts (loc.coords) so this
// map + the location-detail map + any future map surface share one source
// of truth. Fallback center/zoom is used only when a city has ≤1 location.
const cityFallback: Record<string, { center: [number, number]; zoom: number }> = {
  hamburg: { center: [9.98, 53.565], zoom: 12 },
  berlin: { center: [13.405, 52.511], zoom: 13 },
  vallendar: { center: [7.619, 50.396], zoom: 14 },
};

export default function LocationMap({ onMarkerHover }: { onMarkerHover?: (slug: string | null) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeCity, setActiveCity] = useState("hamburg");

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=" + mapboxgl.accessToken,
      center: cityFallback.hamburg.center,
      zoom: cityFallback.hamburg.zoom,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const cityLocations = locations.filter((l) => l.city === activeCity);
    const coordsList = cityLocations
      .map((l) => l.coords)
      .filter((c): c is [number, number] => Boolean(c));

    if (coordsList.length >= 2) {
      // Multi-location city → fit all markers in the viewport with padding.
      // padding top is larger so the marker popups don't clip against the
      // nav controls; bottom padding keeps markers above sticky UI.
      const bounds = coordsList.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coordsList[0], coordsList[0]),
      );
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 40, right: 40 },
        duration: 1000,
        maxZoom: 14, // don't get too close even if markers are tight together
      });
    } else {
      // Single-location city → fall back to fixed center + zoom.
      const fallback = cityFallback[activeCity];
      if (fallback) {
        map.current.flyTo({ center: fallback.center, zoom: fallback.zoom, duration: 1000 });
      }
    }

    cityLocations.forEach((loc) => {
      const coords = loc.coords;
      if (!coords) return;

      // STACEY "S" marker
      const el = document.createElement("div");
      el.addEventListener("click", (e) => e.stopPropagation());
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${loc.stayType === "SHORT" ? "#1A1A1A" : "#FCB0C0"};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.2s;
          border: 2px solid white;
        ">
          <span style="color: white; font-weight: 900; font-size: 14px; font-family: Montserrat, sans-serif;">S</span>
        </div>
      `;
      // Popup with photo
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, maxWidth: "280px", className: "stacey-popup" }).setHTML(`
        <a href="/locations/${loc.slug}" style="font-family: Montserrat, sans-serif; text-decoration: none; color: inherit; display: block;">
          <div style="position: relative;">
            <img src="${loc.images[0]}" alt="${loc.name}" style="width: 100%; height: 140px; object-fit: cover; display: block; border-radius: 5px;" />
            <span style="
              position: absolute; top: 8px; left: 8px;
              background: ${loc.stayType === "SHORT" ? "#1A1A1A" : "#FCB0C0"};
              color: white; padding: 3px 8px; border-radius: 5px;
              font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;
            ">${loc.stayType === "SHORT" ? "SHORT" : "LONG"}</span>
            <span style="
              position: absolute; bottom: 8px; left: 8px;
              background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
              color: white; padding: 3px 8px; border-radius: 5px;
              font-size: 12px; font-weight: 700;
            ">€${loc.priceFrom}${loc.stayType === "SHORT" ? "/night" : "/mo"}</span>
          </div>
          <div style="padding: 12px;">
            <p style="font-weight: 800; font-size: 15px; margin: 0; color: #1A1A1A;">STACEY ${loc.name}</p>
            <p style="font-size: 11px; color: #6B6B6B; margin: 4px 0 0;">${loc.neighborhood}</p>
            <p style="margin: 8px 0 0; font-size: 11px; font-weight: 600; color: #1A1A1A;">View location →</p>
          </div>
        </a>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current!);

      let hoverTimeout: ReturnType<typeof setTimeout>;

      el.addEventListener("mouseenter", () => {
        const inner = el.firstElementChild as HTMLElement;
        if (inner) inner.style.transform = "scale(1.3)";
        onMarkerHover?.(loc.slug);
        popup.setLngLat(coords).addTo(map.current!);
      });
      el.addEventListener("mouseleave", () => {
        const inner = el.firstElementChild as HTMLElement;
        if (inner) inner.style.transform = "scale(1)";
        onMarkerHover?.(null);
        // Delay removal so user can hover onto popup
        hoverTimeout = setTimeout(() => popup.remove(), 300);
      });

      // Keep popup open when hovering over it
      popup.getElement()?.addEventListener?.("mouseenter", () => {
        clearTimeout(hoverTimeout);
      });
      popup.getElement()?.addEventListener?.("mouseleave", () => {
        popup.remove();
      });

      // Also attach listeners after popup opens (element not available until then)
      popup.on("open", () => {
        const popupEl = popup.getElement();
        if (popupEl) {
          popupEl.addEventListener("mouseenter", () => clearTimeout(hoverTimeout));
          popupEl.addEventListener("mouseleave", () => popup.remove());
        }
      });

      markersRef.current.push(marker);
    });
  }, [activeCity, onMarkerHover]);

  return (
    <div>
      {/* City tabs */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {[
          { slug: "hamburg", label: "Hamburg", count: 6 },
          { slug: "berlin", label: "Berlin", count: 1 },
          { slug: "vallendar", label: "Vallendar", count: 1 },
        ].map((city) => (
          <button
            key={city.slug}
            onClick={() => setActiveCity(city.slug)}
            className={`rounded-[5px] px-4 py-2 text-sm font-semibold transition-colors ${
              activeCity === city.slug
                ? "bg-black text-white"
                : "bg-[#F0F0F0] text-gray hover:text-black"
            }`}
          >
            {city.label} · {city.count}
          </button>
        ))}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="h-[420px] w-full overflow-hidden rounded-[5px] sm:h-[600px]"
      />
    </div>
  );
}
