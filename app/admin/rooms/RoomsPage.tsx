"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  LayoutGrid,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";

type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
};

type ActiveBooking = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  moveInDate: string | null;
};

type Room = {
  id: string;
  roomNumber: string;
  category: string;
  monthlyRent: number;
  buildingAddress: string | null;
  floorDescription: string | null;
  status: "ACTIVE" | "BLOCKED" | "DEACTIVATED";
  tenants: Tenant[];
  bookings: ActiveBooking[];
  transfersTo: {
    id: string;
    transferDate: string;
    tenant: { firstName: string; lastName: string };
  }[];
};

type Apartment = {
  id: string;
  number: number | null;
  address: string | null;
  houseNumber: string;
  floor: string;
  label: string | null;
  rooms: Room[];
};

type Location = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  stayType: "LONG" | "SHORT";
  apartments: Apartment[];
};

const CATEGORIES = [
  "BASIC_PLUS",
  "MIGHTY",
  "PREMIUM",
  "PREMIUM_PLUS",
  "PREMIUM_BALCONY",
  "PREMIUM_PLUS_BALCONY",
  "JUMBO",
  "JUMBO_BALCONY",
  "STUDIO",
  "DUPLEX",
] as const;

const STATUSES = ["ACTIVE", "BLOCKED", "DEACTIVATED"] as const;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function daysUntilFree(moveOut: string | null, nowTs: number): number | null {
  if (!moveOut) return null;
  const d = Math.floor((new Date(moveOut).getTime() - nowTs) / 86_400_000);
  return d >= 0 ? d : null;
}

type RoomSortCol = "room" | "floor" | "apt" | "category" | "price" | "status" | "tenant";
type SortDir = "asc" | "desc";

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// A tenant whose moveOut has passed is not occupying anymore — same rule
// as the public booking tool (lib/availability.ts).
function isCurrentlyOccupied(r: Room): boolean {
  if (!r.tenants[0]) return false;
  if (r.tenants[0].moveOut) {
    const out = new Date(r.tenants[0].moveOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (out <= today) return false;
  }
  return true;
}

type ModalState =
  | { kind: null }
  | { kind: "addLocation" }
  | { kind: "editLocation"; location: Location }
  | { kind: "addApartment"; locationId: string; locationName: string }
  | { kind: "editApartment"; apartment: Apartment; locationName: string }
  | { kind: "addRoom"; apartmentId: string; apartmentLabel: string }
  | { kind: "editRoom"; room: Room };

export default function RoomsPage({
  locations,
}: {
  locations: Location[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // URL-driven state
  const selectedLocationId = (() => {
    const p = sp.get("location");
    if (p && locations.some((l) => l.id === p)) return p;
    return locations[0]?.id || "";
  })();
  const view = (sp.get("view") as "table" | "cards") ?? "table";
  const search = sp.get("q") ?? "";
  const filterStatus = sp.get("status") ?? "";
  const sortCol = (sp.get("sortBy") as RoomSortCol) ?? "room";
  const sortDir = (sp.get("sortDir") as SortDir) ?? "asc";

  const writeParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, sp]
  );

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => writeParams({ q: searchInput }), 200);
    return () => clearTimeout(t);
  }, [searchInput, search, writeParams]);

  const [nowTs] = useState(() => Date.now());
  const [modal, setModal] = useState<ModalState>({ kind: null });

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  // Flatten rooms for the selected location with parent references
  type FlatRoom = Room & {
    apartment: Apartment;
    locationName: string;
    occupancyStatus: "occupied" | "reserved" | "reserved_transfer" | "vacant" | "blocked" | "deactivated" | "leaving";
    freeInDays: number | null;
    scheduledTransfer: { tenant: string; date: string } | null;
  };

  const flatRooms: FlatRoom[] = useMemo(() => {
    if (!selectedLoc) return [];
    return selectedLoc.apartments.flatMap((apt) =>
      apt.rooms.map((r) => {
        const occ = isCurrentlyOccupied(r);
        const leaving = occ && Boolean(r.tenants[0]?.moveOut);
        const reserved = !occ && r.bookings.length > 0;
        const hasScheduledTransfer = r.transfersTo.length > 0;
        const blocked = r.status === "BLOCKED";
        const deactivated = r.status === "DEACTIVATED";
        const vacant = !occ && !reserved && !hasScheduledTransfer && !blocked && !deactivated;
        const status = deactivated
          ? "deactivated"
          : blocked
            ? "blocked"
            : leaving
              ? "leaving"
              : reserved
                ? "reserved"
                : hasScheduledTransfer && !occ
                  ? "reserved_transfer"
                  : vacant
                    ? "vacant"
                    : "occupied";
        return {
          ...r,
          apartment: apt,
          locationName: selectedLoc.name,
          occupancyStatus: status,
          freeInDays: leaving ? daysUntilFree(r.tenants[0]?.moveOut ?? null, nowTs) : null,
          scheduledTransfer: hasScheduledTransfer
            ? {
                tenant: `${r.transfersTo[0].tenant.firstName} ${r.transfersTo[0].tenant.lastName}`,
                date: r.transfersTo[0].transferDate,
              }
            : null,
        };
      })
    );
  }, [selectedLoc, nowTs]);

  // Per-location KPIs
  const locKpis = useMemo(() => {
    const active = flatRooms.filter((r) => r.status === "ACTIVE");
    return {
      total: flatRooms.length,
      occupied: flatRooms.filter((r) => r.occupancyStatus === "occupied" || r.occupancyStatus === "leaving").length,
      reserved: flatRooms.filter((r) => r.occupancyStatus === "reserved").length,
      vacant: flatRooms.filter((r) => r.occupancyStatus === "vacant").length,
      blocked: flatRooms.filter((r) => r.occupancyStatus === "blocked").length,
      deactivated: flatRooms.filter((r) => r.occupancyStatus === "deactivated").length,
      occupancyPct: active.length > 0
        ? Math.round(
            (flatRooms.filter((r) => r.occupancyStatus === "occupied" || r.occupancyStatus === "leaving").length /
              active.length) *
              100
          )
        : 0,
    };
  }, [flatRooms]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = flatRooms.filter((r) => {
      if (filterStatus && r.occupancyStatus !== filterStatus) return false;
      if (q) {
        const hay = [
          r.roomNumber,
          formatCategory(r.category),
          r.tenants[0]?.firstName ?? "",
          r.tenants[0]?.lastName ?? "",
          r.apartment.floor,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const get = (r: FlatRoom): string | number => {
        switch (sortCol) {
          case "room": return r.roomNumber;
          case "floor": return r.apartment.floor;
          case "apt": return r.apartment.number ?? 0;
          case "category": return r.category;
          case "price": return r.monthlyRent;
          case "status": return r.occupancyStatus;
          case "tenant": return r.tenants[0] ? `${r.tenants[0].lastName} ${r.tenants[0].firstName}` : "zzz";
          default: return r.roomNumber;
        }
      };
      const av = get(a), bv = get(b);
      if (av === bv) return 0;
      return av < bv ? -dir : dir;
    });
    return rows;
  }, [flatRooms, search, filterStatus, sortCol, sortDir]);

  function toggleSort(col: RoomSortCol) {
    writeParams({
      sortBy: col,
      sortDir: sortCol === col && sortDir === "asc" ? "desc" : "asc",
    });
  }

  function close() { setModal({ kind: null }); }
  function refresh() { close(); router.refresh(); }

  return (
    <div>
      {/* Location tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {locations.map((loc) => {
          const locRooms = loc.apartments.flatMap((a) => a.rooms);
          const locActive = locRooms.filter((r) => r.status === "ACTIVE");
          const locVacant = locActive.filter(
            (r) => !isCurrentlyOccupied(r) && r.bookings.length === 0
          ).length;
          return (
            <button
              key={loc.id}
              onClick={() => writeParams({ location: loc.id })}
              className={`px-3 py-2 rounded-[5px] text-sm transition-colors ${
                selectedLocationId === loc.id
                  ? "bg-black text-white font-semibold"
                  : "bg-white border border-lightgray hover:border-black"
              }`}
            >
              {loc.name}
              <span className="ml-2 text-xs opacity-70">
                {locVacant} free
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-location KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
        <Stat label="Total" value={locKpis.total} />
        <Stat label={`Occupied ${locKpis.occupancyPct}%`} value={locKpis.occupied} tone="ok" />
        <Stat label="Reserved" value={locKpis.reserved} tone="warn" />
        <Stat label="Vacant" value={locKpis.vacant} tone="info" />
        <Stat label="Blocked" value={locKpis.blocked} tone="muted" />
        <Stat label="Deactivated" value={locKpis.deactivated} tone="muted" />
      </div>

      {/* Filter bar + view toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search room#, tenant, category…"
            className="w-full pl-8 pr-8 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray hover:text-black">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => writeParams({ status: e.target.value })}
          className="px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="occupied">Occupied</option>
          <option value="leaving">Leaving</option>
          <option value="reserved">Reserved</option>
          <option value="vacant">Vacant</option>
          <option value="blocked">Blocked</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <span className="text-xs text-gray">{filtered.length} rooms</span>

        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden ml-auto">
          <button
            onClick={() => writeParams({ view: "table" })}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm ${view === "table" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            <TableIcon className="w-4 h-4" /> Table
          </button>
          <button
            onClick={() => writeParams({ view: "cards" })}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm border-l border-lightgray ${view === "cards" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Cards
          </button>
        </div>
      </div>

      {/* Location header + admin actions */}
      {selectedLoc && (
        <div className="bg-white rounded-[5px] border border-lightgray p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="font-semibold text-sm text-black">{selectedLoc.name}</span>
            <span className="text-xs text-gray ml-2">
              {selectedLoc.city} · {selectedLoc.address}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setModal({ kind: "addApartment", locationId: selectedLoc.id, locationName: selectedLoc.name })}
              className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
            >
              <Plus className="w-3 h-3" /> Apartment
            </button>
            <button
              onClick={() => setModal({ kind: "editLocation", location: selectedLoc })}
              className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>
        </div>
      )}

      {/* Table view (default) */}
      {view === "table" && (
        <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[8%]" />   {/* Room */}
              <col className="w-[12%]" />  {/* Floor */}
              <col className="w-[5%]" />   {/* Apt */}
              <col className="w-[12%]" />  {/* Category */}
              <col className="w-[8%]" />   {/* Price */}
              <col className="w-[10%]" />  {/* Status */}
              <col className="w-[18%]" />  {/* Tenant */}
              <col className="w-[9%]" />   {/* Move-in */}
              <col className="w-[9%]" />   {/* Move-out */}
              <col className="w-[5%]" />   {/* Actions */}
            </colgroup>
            <thead>
              <tr className="border-b border-lightgray bg-background-alt text-[11px]">
                <SortTh label="Room" col="room" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Floor" col="floor" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Apt" col="apt" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Price" col="price" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortTh label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Tenant" col="tenant" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-gray uppercase tracking-wide">In</th>
                <th className="px-3 py-2 text-left text-gray uppercase tracking-wide">Out</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-gray">No rooms match</td></tr>
              ) : filtered.map((r, idx) => {
                const zebra = idx % 2 === 1 ? "bg-background-alt/40" : "";
                const statusCls: Record<string, string> = {
                  occupied: "bg-green-100 text-green-700",
                  leaving: "bg-yellow-100 text-yellow-700",
                  reserved: "bg-orange-100 text-orange-700",
                  reserved_transfer: "bg-purple-100 text-purple-700",
                  vacant: "bg-blue-100 text-blue-700",
                  blocked: "bg-red-100 text-red-700",
                  deactivated: "bg-gray-100 text-gray-500",
                };
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-lightgray/30 hover:bg-blue-50/40 text-sm ${zebra} ${r.occupancyStatus === "deactivated" ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-2 font-medium">{r.roomNumber}</td>
                    <td className="px-3 py-2 text-gray truncate">{r.apartment.floor}</td>
                    <td className="px-3 py-2 tabular-nums text-center">{r.apartment.number ?? "—"}</td>
                    <td className="px-3 py-2 truncate">{formatCategory(r.category)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">€{(r.monthlyRent / 100).toLocaleString("de-DE")}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase ${statusCls[r.occupancyStatus] ?? ""}`}
                        title={r.scheduledTransfer ? `Transfer: ${r.scheduledTransfer.tenant} am ${formatDate(r.scheduledTransfer.date)}` : undefined}
                      >
                        {r.occupancyStatus === "leaving"
                          ? `leaving ${r.freeInDays !== null ? `${r.freeInDays}d` : ""}`
                          : r.occupancyStatus === "reserved_transfer"
                            ? `transfer ${formatDate(r.scheduledTransfer?.date ?? "")}`
                            : r.occupancyStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 truncate">
                      {r.tenants[0] ? (
                        <span>{r.tenants[0].firstName} {r.tenants[0].lastName}</span>
                      ) : r.bookings[0] ? (
                        <span className="text-orange-600">{r.bookings[0].firstName} {r.bookings[0].lastName}</span>
                      ) : (
                        <span className="text-gray">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray">{r.tenants[0] ? formatDate(r.tenants[0].moveIn) : r.bookings[0]?.moveInDate ? formatDate(r.bookings[0].moveInDate) : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.tenants[0]?.moveOut ? (
                        <span className="text-orange-600 font-medium">{formatDate(r.tenants[0].moveOut)}</span>
                      ) : r.tenants[0] ? (
                        <span className="text-gray">open-end</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setModal({ kind: "editRoom", room: r })}
                        className="p-1 text-gray hover:text-black rounded-[5px] hover:bg-background-alt"
                        aria-label="Edit room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards view */}
      {view === "cards" && selectedLoc && (
        <div className="space-y-4">
          {selectedLoc.apartments.length === 0 ? (
            <div className="bg-white rounded-[5px] border border-lightgray p-6 text-center text-sm text-gray">
              No apartments yet.
            </div>
          ) : (
            selectedLoc.apartments.map((apt) => (
              <ApartmentBlock
                key={apt.id}
                apartment={apt}
                locationName={selectedLoc.name}
                onEditApartment={() =>
                  setModal({ kind: "editApartment", apartment: apt, locationName: selectedLoc.name })
                }
                onAddRoom={() =>
                  setModal({ kind: "addRoom", apartmentId: apt.id, apartmentLabel: apt.label ?? `${apt.houseNumber} · ${apt.floor}` })
                }
                onEditRoom={(room) => setModal({ kind: "editRoom", room })}
                onDeleted={() => router.refresh()}
              />
            ))
          )}
        </div>
      )}

      {/* Modals — kept intact */}
      {modal.kind === "addLocation" && <LocationModal onSaved={refresh} onClose={close} />}
      {modal.kind === "editLocation" && <LocationModal location={modal.location} onSaved={refresh} onClose={close} />}
      {modal.kind === "addApartment" && <ApartmentModal locationId={modal.locationId} locationName={modal.locationName} onSaved={refresh} onClose={close} />}
      {modal.kind === "editApartment" && <ApartmentModal apartment={modal.apartment} locationName={modal.locationName} onSaved={refresh} onClose={close} />}
      {modal.kind === "addRoom" && <RoomModal apartmentId={modal.apartmentId} apartmentLabel={modal.apartmentLabel} onSaved={refresh} onClose={close} />}
      {modal.kind === "editRoom" && <RoomModal room={modal.room} onSaved={refresh} onClose={close} />}
    </div>
  );
}

// ─── Apartment block ────────────────────────────────────────

function ApartmentBlock({
  apartment,
  locationName,
  onEditApartment,
  onAddRoom,
  onEditRoom,
  onDeleted,
}: {
  apartment: Apartment;
  locationName: string;
  onEditApartment: () => void;
  onAddRoom: () => void;
  onEditRoom: (room: Room) => void;
  onDeleted: () => void;
}) {
  async function deleteApartment() {
    if (!confirm(`Delete apartment "${apartment.houseNumber} · ${apartment.floor}"?`)) return;
    const res = await fetch(`/api/admin/apartments/${apartment.id}`, {
      method: "DELETE",
    });
    if (res.ok) onDeleted();
    else {
      const data = await res.json().catch(() => ({}));
      alert(`Delete failed: ${data.error ?? res.statusText}`);
    }
  }

  async function deleteRoom(roomId: string, roomNumber: string) {
    if (!confirm(`Delete room #${roomNumber}?`)) return;
    const res = await fetch(`/api/admin/rooms/${roomId}`, { method: "DELETE" });
    if (res.ok) onDeleted();
    else {
      const data = await res.json().catch(() => ({}));
      alert(`Delete failed: ${data.error ?? res.statusText}`);
    }
  }

  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <div className="px-4 py-3 bg-background-alt border-b border-lightgray flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm">
            {locationName} — {apartment.houseNumber}
            {apartment.label ? ` (${apartment.label})` : ""} — {apartment.floor}
          </h3>
          <p className="text-xs text-gray mt-0.5">
            {apartment.rooms.length} rooms,{" "}
            {apartment.rooms.filter((r) => !isCurrentlyOccupied(r) && r.status === "ACTIVE").length} vacant
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddRoom}
            className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-white"
          >
            <Plus className="w-3 h-3" /> Room
          </button>
          <button
            onClick={onEditApartment}
            className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-white"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={deleteApartment}
            className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 rounded-[5px] text-xs hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {apartment.rooms.length === 0 ? (
        <div className="px-4 py-4 text-xs text-gray">
          No rooms yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {apartment.rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onEdit={() => onEditRoom(room)}
              onDelete={() => deleteRoom(room.id, room.roomNumber)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room,
  onEdit,
  onDelete,
}: {
  room: Room;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const occupied = isCurrentlyOccupied(room);
  const isVacant = !occupied && room.bookings.length === 0 && room.status === "ACTIVE";
  const isReserved = !occupied && room.bookings.length > 0;
  const tenant = room.tenants[0] ?? null;
  const isLeaving = occupied && tenant?.moveOut;
  const isBlocked = room.status === "BLOCKED";
  const isDeactivated = room.status === "DEACTIVATED";
  const activeBooking = room.bookings[0];

  let cardClass = "border-lightgray";
  if (isDeactivated) cardClass = "border-gray-300 bg-gray-50 opacity-60";
  else if (isBlocked) cardClass = "border-red-200 bg-red-50";
  else if (isVacant) cardClass = "border-green-200 bg-green-50";
  else if (isReserved) cardClass = "border-orange-200 bg-orange-50";
  else if (isLeaving) cardClass = "border-yellow-200 bg-yellow-50";

  return (
    <div className={`rounded-[5px] border p-3 text-sm ${cardClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">#{room.roomNumber}</span>
          {isBlocked && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-[5px] font-semibold">
              BLOCKED
            </span>
          )}
          {isDeactivated && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-[5px] font-semibold">
              DEACTIVATED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray">{formatCategory(room.category)}</span>
          <button
            onClick={onEdit}
            className="text-gray hover:text-black"
            aria-label="Edit room"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="text-gray hover:text-red-500"
            aria-label="Delete room"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray mb-1">€{(room.monthlyRent / 100).toFixed(0)}/mo</div>
      {tenant ? (
        <>
          <p className="text-sm">
            {tenant.firstName} {tenant.lastName}
          </p>
          <p className="text-xs text-gray">{tenant.email}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs text-gray">In: {formatDate(tenant.moveIn)}</span>
            {tenant.moveOut && (
              <span className="text-xs text-yellow-600 font-medium">
                Out: {formatDate(tenant.moveOut)}
              </span>
            )}
          </div>
        </>
      ) : isReserved && activeBooking ? (
        <>
          <p className="text-sm">
            {activeBooking.firstName} {activeBooking.lastName}
          </p>
          <p className="text-xs text-orange-600 font-medium">
            Reserved — {activeBooking.status.replace(/_/g, " ")}
          </p>
          {activeBooking.moveInDate && (
            <span className="text-xs text-gray">
              Move-in: {formatDate(activeBooking.moveInDate)}
            </span>
          )}
        </>
      ) : isBlocked ? (
        <p className="text-red-700 text-xs font-medium mt-1">Blocked from booking</p>
      ) : isDeactivated ? (
        <p className="text-gray text-xs font-medium mt-1">Removed from inventory</p>
      ) : (
        <p className="text-green-600 text-xs font-medium mt-1">Vacant</p>
      )}
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────

function LocationModal({
  location,
  onSaved,
  onClose,
}: {
  location?: Location;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(location);
  const [slug, setSlug] = useState(location?.slug ?? "");
  const [name, setName] = useState(location?.name ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [stayType, setStayType] = useState<"LONG" | "SHORT">(
    location?.stayType ?? "LONG"
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!slug || !name || !city || !address) {
      alert("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = isEdit
        ? await fetch(`/api/admin/locations/${location!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, name, city, address, stayType }),
          })
        : await fetch("/api/admin/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, name, city, address, stayType }),
          });
      if (res.ok) onSaved();
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit location" : "Add location"} onClose={onClose}>
      <FormInput label="Slug" value={slug} onChange={setSlug} placeholder="muehlenkamp" />
      <FormInput label="Name" value={name} onChange={setName} placeholder="Mühlenkamp" />
      <FormInput label="City" value={city} onChange={setCity} placeholder="Hamburg" />
      <FormInput label="Address" value={address} onChange={setAddress} placeholder="Dorotheenstraße 3-5" />
      <label className="block">
        <span className="block text-xs text-gray mb-1">Stay type</span>
        <select
          value={stayType}
          onChange={(e) => setStayType(e.target.value as "LONG" | "SHORT")}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
      </label>
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function ApartmentModal({
  apartment,
  locationId,
  locationName,
  onSaved,
  onClose,
}: {
  apartment?: Apartment;
  locationId?: string;
  locationName: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(apartment);
  const [houseNumber, setHouseNumber] = useState(apartment?.houseNumber ?? "");
  const [floor, setFloor] = useState(apartment?.floor ?? "");
  const [label, setLabel] = useState(apartment?.label ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!houseNumber || !floor) {
      alert("House number and floor are required");
      return;
    }
    setSaving(true);
    try {
      const res = isEdit
        ? await fetch(`/api/admin/apartments/${apartment!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ houseNumber, floor, label: label || null }),
          })
        : await fetch("/api/admin/apartments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              locationId,
              houseNumber,
              floor,
              label: label || null,
            }),
          });
      if (res.ok) onSaved();
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${isEdit ? "Edit" : "Add"} apartment in ${locationName}`}
      onClose={onClose}
    >
      <FormInput
        label="House number"
        value={houseNumber}
        onChange={setHouseNumber}
        placeholder="D3a"
      />
      <FormInput
        label="Floor"
        value={floor}
        onChange={setFloor}
        placeholder="2.OG rechts"
      />
      <FormInput
        label="Label (optional)"
        value={label}
        onChange={setLabel}
        placeholder="Vorderhaus"
      />
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function RoomModal({
  room,
  apartmentId,
  apartmentLabel,
  onSaved,
  onClose,
}: {
  room?: Room;
  apartmentId?: string;
  apartmentLabel?: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(room);
  const [roomNumber, setRoomNumber] = useState(room?.roomNumber ?? "");
  const [category, setCategory] = useState(room?.category ?? "BASIC_PLUS");
  const [monthlyRent, setMonthlyRent] = useState(
    room ? (room.monthlyRent / 100).toFixed(2) : ""
  );
  const [buildingAddress, setBuildingAddress] = useState(
    room?.buildingAddress ?? ""
  );
  const [floorDescription, setFloorDescription] = useState(
    room?.floorDescription ?? ""
  );
  const [status, setStatus] = useState<typeof STATUSES[number]>(
    room?.status ?? "ACTIVE"
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(monthlyRent.replace(",", ".")) * 100);
    if (!roomNumber || !Number.isFinite(cents) || cents < 0) {
      alert("Room number and a valid monthly rent are required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        roomNumber,
        category,
        monthlyRent: cents,
        buildingAddress: buildingAddress || null,
        floorDescription: floorDescription || null,
      };
      if (isEdit) payload.status = status;

      const res = isEdit
        ? await fetch(`/api/admin/rooms/${room!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, apartmentId }),
          });
      if (res.ok) onSaved();
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={
        isEdit
          ? `Edit room #${room!.roomNumber}`
          : `Add room in ${apartmentLabel ?? "apartment"}`
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-2">
        <FormInput
          label="Room number"
          value={roomNumber}
          onChange={setRoomNumber}
          placeholder="201"
        />
        <FormInput
          label="Monthly rent (€)"
          value={monthlyRent}
          onChange={setMonthlyRent}
          placeholder="950.00"
          type="number"
        />
      </div>
      <label className="block">
        <span className="block text-xs text-gray mb-1">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
      </label>
      <FormInput
        label="Building address (optional override)"
        value={buildingAddress}
        onChange={setBuildingAddress}
        placeholder="Dorotheenstraße 5"
      />
      <FormInput
        label="Floor description (optional)"
        value={floorDescription}
        onChange={setFloorDescription}
        placeholder="3. OG rechts"
      />
      {isEdit && (
        <label className="block">
          <span className="block text-xs text-gray mb-1">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof STATUSES[number])}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray mt-1">
            BLOCKED = temporarily not bookable. DEACTIVATED = removed from inventory.
          </p>
        </label>
      )}
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ─── Sortable table header ────────────────────────────────

function SortTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  col: RoomSortCol;
  sortCol: RoomSortCol;
  sortDir: SortDir;
  onSort: (c: RoomSortCol) => void;
  align?: "left" | "right";
}) {
  const active = sortCol === col;
  return (
    <th
      className={`px-3 py-2 font-semibold text-gray uppercase tracking-wide cursor-pointer select-none hover:text-black whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {active && (sortDir === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />)}
      </span>
    </th>
  );
}

// ─── Shared ────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-black">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray hover:text-black"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm focus:outline-none focus:border-black"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "info" | "muted";
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-600"
      : tone === "warn"
        ? "text-orange-600"
        : tone === "info"
          ? "text-blue-600"
          : tone === "muted"
            ? "text-gray-500"
            : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-4">
      <p className="text-xs text-gray uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}
