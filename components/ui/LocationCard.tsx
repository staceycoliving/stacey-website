"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Badge from "./Badge";
import type { Location } from "@/lib/data";

export default function LocationCard({
  location,
  large = false,
}: {
  location: Location;
  large?: boolean;
}) {
  const href =
    location.city === "vallendar"
      ? "/vallendar"
      : `/${location.city}/${location.slug}`;

  // Large card: image fills the card with text overlay
  if (large) {
    return (
      <Link href={href} className="group block h-full">
        <div className="relative h-full min-h-[400px] overflow-hidden rounded-2xl sm:min-h-[500px]">
          <Image
            src={location.images[0]}
            alt={`STACEY ${location.name}`}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute left-4 top-4">
            <Badge stayType={location.stayType}>
              {location.stayType === "SHORT" ? "Short Stay" : "Long Stay"}
            </Badge>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              {location.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <MapPin size={13} /> {location.address}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-white">
                ab{" "}
                <span className="text-2xl font-bold">
                  &euro;{location.priceFrom}
                </span>
                <span className="text-white/60"> /Monat</span>
              </p>
              <span className="flex items-center gap-1 rounded-[5px] bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                Entdecken <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default card
  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={location.images[0]}
            alt={`STACEY ${location.name}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 350px"
          />
          <div className="absolute left-3 top-3">
            <Badge stayType={location.stayType}>
              {location.stayType === "SHORT" ? "Short Stay" : "Long Stay"}
            </Badge>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-lg font-bold text-black">{location.name}</h3>
          <p className="mt-1 text-sm text-gray">{location.address}</p>
          <p className="mt-3 text-sm font-medium text-black">
            ab{" "}
            <span className="text-lg font-bold">&euro;{location.priceFrom}</span>{" "}
            / Monat{" "}
            <span className="text-xs text-gray">(all-inclusive)</span>
          </p>
          <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Entdecken <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
