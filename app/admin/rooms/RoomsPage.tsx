"use client";

import { useState } from "react";

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
};

type Room = {
  id: string;
  roomNumber: string;
  category: string;
  tenant: Tenant | null;
};

type Apartment = {
  id: string;
  houseNumber: string;
  floor: string;
  label: string | null;
  rooms: Room[];
};

type LongLocation = {
  id: string;
  slug: string;
  name: string;
  city: string;
  apartments: Apartment[];
};

type ShortLocation = {
  id: string;
  slug: string;
  name: string;
  city: string;
  capacities: { id: string; category: string; totalUnits: number }[];
  bookings: { id: string; category: string; checkIn: string; checkOut: string }[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function RoomsPage({
  locations,
  shortLocations,
}: {
  locations: LongLocation[];
  shortLocations: ShortLocation[];
}) {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || "");
  const [showShort, setShowShort] = useState(false);

  // LONG stay stats
  const allRooms = locations.flatMap((l) =>
    l.apartments.flatMap((a) => a.rooms)
  );
  const totalRooms = allRooms.length;
  const occupied = allRooms.filter((r) => r.tenant).length;
  const vacant = totalRooms - occupied;
  const leaving = allRooms.filter((r) => r.tenant?.moveOut).length;

  const selectedLoc = locations.find((l) => l.id === selectedLocation);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Total rooms</p>
          <p className="text-2xl font-bold mt-1">{totalRooms}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Occupied</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{occupied}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Vacant</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{vacant}</p>
        </div>
        <div className="bg-white rounded-[5px] border border-lightgray p-4">
          <p className="text-xs text-gray uppercase tracking-wide">Leaving soon</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{leaving}</p>
        </div>
      </div>

      {/* Toggle LONG / SHORT */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setShowShort(false)}
          className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
            !showShort ? "bg-black text-white" : "bg-white border border-lightgray text-gray hover:text-black"
          }`}
        >
          LONG Stay ({locations.length} locations)
        </button>
        <button
          onClick={() => setShowShort(true)}
          className={`px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
            showShort ? "bg-black text-white" : "bg-white border border-lightgray text-gray hover:text-black"
          }`}
        >
          SHORT Stay ({shortLocations.length} locations)
        </button>
      </div>

      {!showShort ? (
        <>
          {/* Location picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {locations.map((loc) => {
              const locRooms = loc.apartments.flatMap((a) => a.rooms);
              const locVacant = locRooms.filter((r) => !r.tenant).length;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`px-3 py-2 rounded-[5px] text-sm transition-colors ${
                    selectedLocation === loc.id
                      ? "bg-black text-white font-semibold"
                      : "bg-white border border-lightgray hover:border-black"
                  }`}
                >
                  {loc.name}
                  <span className="ml-2 text-xs opacity-70">{locVacant} free</span>
                </button>
              );
            })}
          </div>

          {/* Room grid for selected location */}
          {selectedLoc && (
            <div className="space-y-4">
              {selectedLoc.apartments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
                  <div className="px-4 py-3 bg-background-alt border-b border-lightgray">
                    <h3 className="font-semibold text-sm">
                      {selectedLoc.name} — {apt.houseNumber} {apt.label ? `(${apt.label})` : ""} — {apt.floor}
                    </h3>
                    <p className="text-xs text-gray mt-0.5">
                      {apt.rooms.length} rooms, {apt.rooms.filter((r) => !r.tenant).length} vacant
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {apt.rooms.map((room) => {
                      const isVacant = !room.tenant;
                      const isLeaving = room.tenant?.moveOut;
                      return (
                        <div
                          key={room.id}
                          className={`rounded-[5px] border p-3 text-sm ${
                            isVacant
                              ? "border-green-200 bg-green-50"
                              : isLeaving
                              ? "border-yellow-200 bg-yellow-50"
                              : "border-lightgray"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">#{room.roomNumber}</span>
                            <span className="text-xs text-gray">{formatCategory(room.category)}</span>
                          </div>
                          {room.tenant ? (
                            <>
                              <p className="text-sm">{room.tenant.firstName} {room.tenant.lastName}</p>
                              <p className="text-xs text-gray">{room.tenant.email}</p>
                              <div className="flex gap-3 mt-1">
                                <span className="text-xs text-gray">In: {formatDate(room.tenant.moveIn)}</span>
                                {room.tenant.moveOut && (
                                  <span className="text-xs text-yellow-600 font-medium">
                                    Out: {formatDate(room.tenant.moveOut)}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-green-600 text-xs font-medium mt-1">Vacant</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* SHORT Stay overview */
        <div className="space-y-4">
          {shortLocations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
              <div className="px-4 py-3 bg-background-alt border-b border-lightgray">
                <h3 className="font-semibold text-sm">{loc.name} — {loc.city}</h3>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray uppercase tracking-wide">
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Total units</th>
                      <th className="pb-2">Active bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loc.capacities.map((cap) => {
                      const activeBookings = loc.bookings.filter(
                        (b) => b.category === cap.category
                      ).length;
                      return (
                        <tr key={cap.id} className="border-t border-lightgray/50">
                          <td className="py-2 font-medium">{formatCategory(cap.category)}</td>
                          <td className="py-2">{cap.totalUnits}</td>
                          <td className="py-2">
                            <span className={activeBookings >= cap.totalUnits ? "text-red-500 font-medium" : ""}>
                              {activeBookings}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
