"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, X, Tag } from "lucide-react";

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
  tenant: Tenant | null;
  bookings: ActiveBooking[];
};

type Apartment = {
  id: string;
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

// A tenant whose moveOut has passed is not occupying anymore — same rule
// as the public booking tool (lib/availability.ts).
function isCurrentlyOccupied(r: Room): boolean {
  if (!r.tenant) return false;
  if (r.tenant.moveOut) {
    const out = new Date(r.tenant.moveOut);
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
  | { kind: "editRoom"; room: Room }
  | { kind: "batchPrice"; location: Location };

export default function RoomsPage({
  locations,
}: {
  locations: Location[];
}) {
  const router = useRouter();
  // Accept ?location=<id> from links (e.g. from the pricing matrix). Fall
  // back to the first location if no param or the id doesn't match.
  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialLocationId = (() => {
    const param = searchParams?.get("location");
    if (param && locations.some((l) => l.id === param)) return param;
    return locations[0]?.id || "";
  })();
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [modal, setModal] = useState<ModalState>({ kind: null });

  const allRooms = locations.flatMap((l) =>
    l.apartments.flatMap((a) => a.rooms)
  );
  const totalRooms = allRooms.length;
  const activeRooms = allRooms.filter((r) => r.status === "ACTIVE");
  const occupied = activeRooms.filter(isCurrentlyOccupied).length;
  const reserved = activeRooms.filter(
    (r) => !isCurrentlyOccupied(r) && r.bookings.length > 0
  ).length;
  const vacant = activeRooms.length - occupied - reserved;
  const blocked = allRooms.filter((r) => r.status === "BLOCKED").length;

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  function close() {
    setModal({ kind: null });
  }
  function refresh() {
    close();
    router.refresh();
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <Stat label="Total" value={totalRooms} />
        <Stat label="Occupied" value={occupied} tone="ok" />
        <Stat label="Reserved" value={reserved} tone="warn" />
        <Stat label="Vacant" value={vacant} tone="info" />
        <Stat label="Blocked" value={blocked} tone="muted" />
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold">Property inventory</h2>
        <button
          onClick={() => setModal({ kind: "addLocation" })}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-[5px] text-sm font-medium hover:bg-black/90"
        >
          <Plus className="w-4 h-4" /> Add location
        </button>
      </div>

      {/* Location tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {locations.map((loc) => {
          const locRooms = loc.apartments.flatMap((a) => a.rooms);
          const locVacant = locRooms.filter(
            (r) => !isCurrentlyOccupied(r) && r.status === "ACTIVE"
          ).length;
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`px-3 py-2 rounded-[5px] text-sm transition-colors ${
                selectedLocationId === loc.id
                  ? "bg-black text-white font-semibold"
                  : "bg-white border border-lightgray hover:border-black"
              }`}
            >
              {loc.name}
              <span className="ml-2 text-xs opacity-70">
                {loc.stayType} · {locVacant} free
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected location detail */}
      {selectedLoc && (
        <div className="space-y-4">
          <div className="bg-white rounded-[5px] border border-lightgray p-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-black">
                {selectedLoc.name}{" "}
                <span className="text-xs text-gray font-normal">
                  ({selectedLoc.slug})
                </span>
              </h3>
              <p className="text-xs text-gray mt-0.5">
                {selectedLoc.city} · {selectedLoc.address} · {selectedLoc.stayType}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  setModal({ kind: "batchPrice", location: selectedLoc })
                }
                className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
              >
                <Tag className="w-3.5 h-3.5" /> Batch price
              </button>
              <button
                onClick={() =>
                  setModal({
                    kind: "addApartment",
                    locationId: selectedLoc.id,
                    locationName: selectedLoc.name,
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
              >
                <Plus className="w-3.5 h-3.5" /> Apartment
              </button>
              <button
                onClick={() =>
                  setModal({ kind: "editLocation", location: selectedLoc })
                }
                className="inline-flex items-center gap-1 px-2 py-1 border border-lightgray rounded-[5px] text-xs hover:bg-background-alt"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete location "${selectedLoc.name}"?`)) return;
                  const res = await fetch(
                    `/api/admin/locations/${selectedLoc.id}`,
                    { method: "DELETE" }
                  );
                  if (res.ok) router.refresh();
                  else {
                    const data = await res.json().catch(() => ({}));
                    alert(`Delete failed: ${data.error ?? res.statusText}`);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 rounded-[5px] text-xs hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {selectedLoc.apartments.length === 0 ? (
            <div className="bg-white rounded-[5px] border border-lightgray p-6 text-center text-sm text-gray">
              No apartments yet. Click <strong>+ Apartment</strong> to add one.
            </div>
          ) : (
            selectedLoc.apartments.map((apt) => (
              <ApartmentBlock
                key={apt.id}
                apartment={apt}
                locationName={selectedLoc.name}
                onEditApartment={() =>
                  setModal({
                    kind: "editApartment",
                    apartment: apt,
                    locationName: selectedLoc.name,
                  })
                }
                onAddRoom={() =>
                  setModal({
                    kind: "addRoom",
                    apartmentId: apt.id,
                    apartmentLabel:
                      apt.label ?? `${apt.houseNumber} · ${apt.floor}`,
                  })
                }
                onEditRoom={(room) => setModal({ kind: "editRoom", room })}
                onDeleted={() => router.refresh()}
              />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {modal.kind === "addLocation" && (
        <LocationModal onSaved={refresh} onClose={close} />
      )}
      {modal.kind === "editLocation" && (
        <LocationModal
          location={modal.location}
          onSaved={refresh}
          onClose={close}
        />
      )}
      {modal.kind === "addApartment" && (
        <ApartmentModal
          locationId={modal.locationId}
          locationName={modal.locationName}
          onSaved={refresh}
          onClose={close}
        />
      )}
      {modal.kind === "editApartment" && (
        <ApartmentModal
          apartment={modal.apartment}
          locationName={modal.locationName}
          onSaved={refresh}
          onClose={close}
        />
      )}
      {modal.kind === "addRoom" && (
        <RoomModal
          apartmentId={modal.apartmentId}
          apartmentLabel={modal.apartmentLabel}
          onSaved={refresh}
          onClose={close}
        />
      )}
      {modal.kind === "editRoom" && (
        <RoomModal
          room={modal.room}
          onSaved={refresh}
          onClose={close}
        />
      )}
      {modal.kind === "batchPrice" && (
        <BatchPriceModal
          location={modal.location}
          onSaved={refresh}
          onClose={close}
        />
      )}
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
  const isLeaving = occupied && room.tenant?.moveOut;
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
      {room.tenant ? (
        <>
          <p className="text-sm">
            {room.tenant.firstName} {room.tenant.lastName}
          </p>
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

function BatchPriceModal({
  location,
  onSaved,
  onClose,
}: {
  location: Location;
  onSaved: () => void;
  onClose: () => void;
}) {
  // Compute existing categories present in this location
  const existing = Array.from(
    new Set(location.apartments.flatMap((a) => a.rooms.map((r) => r.category)))
  );
  const [category, setCategory] = useState(existing[0] ?? CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      alert("Enter a valid price");
      return;
    }
    if (!confirm(
      `Set price for all ${formatCategory(category)} rooms in ${location.name} to €${(cents / 100).toFixed(2)}? Existing tenant contracts are NOT changed.`
    )) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rooms/batch-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          category,
          monthlyRent: cents,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Updated ${data.updated} room(s).`);
        onSaved();
      } else {
        alert(`Failed: ${data.error}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Batch price update — ${location.name}`} onClose={onClose}>
      <p className="text-xs text-gray">
        Updates Room.monthlyRent for all rooms in this location matching the
        category. Existing tenant rents are <strong>not</strong> changed (those are
        snapshots from the lease).
      </p>
      <label className="block">
        <span className="block text-xs text-gray mb-1">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          {existing.length === 0
            ? CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))
            : existing.map((c) => (
                <option key={c} value={c}>
                  {formatCategory(c)}
                </option>
              ))}
        </select>
      </label>
      <FormInput
        label="New price (€)"
        value={price}
        onChange={setPrice}
        placeholder="950.00"
        type="number"
      />
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
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
