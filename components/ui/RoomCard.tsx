"use client";

import Image from "next/image";
import Badge from "./Badge";
import type { Room } from "@/lib/data";

export default function RoomCard({ room }: { room: Room }) {
  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={room.image}
          alt={`STACEY ${room.name} Suite`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {room.sizeSqm && (
          <div className="absolute right-3 top-3">
            <Badge variant="neutral">{room.sizeSqm} m²</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display text-xl font-bold text-black">
          {room.name}
        </h3>
        <p className="mt-1 text-lg font-bold text-pink">
          &euro;{room.priceMonthly}{" "}
          <span className="text-sm font-normal text-gray">/ month</span>
        </p>
        <p className="mt-2 text-sm text-gray">{room.description}</p>
        <p className="mt-3 text-xs text-gray">
          <span className="font-medium text-black">Furnishing:</span>{" "}
          {room.interior}
        </p>
        <p className="mt-2 text-xs text-gray">
          {room.forCouples ? "For singles & couples" : "For singles"}
        </p>

        <button className="mt-4 w-full rounded-[5px] bg-pink px-4 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]">
          Check availability
        </button>
      </div>
    </div>
  );
}
